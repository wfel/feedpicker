import browser from '../utils/browser-polyfill';
import * as _lang from 'lodash/lang';
import * as _merge from 'lodash/merge';
import Dexie from 'dexie';
import {
    serializableObjectCloneDeep,
    checkConfig,
    createConfigV1,
    wrapModule
} from './help-function';
import {
    idbSchemaV1,
    configSchemaV1
} from './storage-schema';

// env
var initializing = false;
var hasInited = false;
var initPromise;
/**
 * 所有get方法都应该返回一个深拷贝
 * 有set方法都应该set一个深拷贝，否则当另一个window被gc时，来自另一个window的对象的引用会变得不可达
 * _.cloneDeep对多window环境支持不好，他在clone的时候把原对象的prototype绑到新对象上了
 */
var configObj;
var db;
var shouldSaveConfigObj = false;

/**
 * init() should always be called before using any of the functions in storage.js
 * @async
 * @returns {Promise<undefined>} Promise will resolve when it is inited. It does not resolve with any value.
 */
function init() {
    /**
     * storage.local will be loaded into memory once background.js is executed. Then it will stay in memory until some changes have been made to it, at which time it will be written back to storage.local. (this can convert async read/write to sync read/write)
     */
    if (hasInited || initializing) return initPromise;
    initializing = true;
    initPromise = Promise.all([initConfig(), connectDB()]).then(finallize);
    return initPromise;
}

function initConfig() {
    var shouldSave = false;
    return browser.storage.local.get(null).then(obj => {
        if (_lang.isArray(obj)) {
            // some firefox specific fixes, check https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/get#Return_value
            obj = obj[0];
        }
        for(let key of Object.keys(obj)) {
            obj[key] = JSON.parse(obj[key]);
        }
        switch(obj.configVersion) {
            default:
            // not a valid version
            obj = createConfigV1();
            shouldSave = true;
            break;
            case 1:
            // do nothing now
            // can use upgradeToV2(obj); shouldSave = true; in the future
            // case 2:
            // upgradeToV3(obj);
            // shouldSave = true;
            // case 3:
            // ...
        }
        checkConfig(obj, configSchemaV1);
        // If the temp config is valid, it is attached to the configObj
        configObj = obj;
        if(shouldSave) {
            enqueueConfigUpdate();
        }
    });
}

function connectDB() {
    db = new Dexie('feed');
    db.version(1).stores({
        articles: idbSchemaV1.articles.schema,
        lastUpdateResult: idbSchemaV1.lastUpdateResult.schema,
        sharedStore: idbSchemaV1.sharedStore.schema
    });

    return db.open().catch( e => {
        console.error('DB failed to open: ' + e);
        return Promise.reject(e);
    });
}

function finallize() {
    initializing = false;
    hasInited = true;
}

/**
 * check if storage module is inited
 */
function checkInited() {
    if (!hasInited)
        throw new Error('Storage has not been inited.');
}

function enqueueConfigUpdate() {
    // enqueue the update event in microtasks
    if (!shouldSaveConfigObj) {
        shouldSaveConfigObj = true;
        Promise.resolve().then(() => {
            if (shouldSaveConfigObj) {
                shouldSaveConfigObj = false;
                var strStore = {};
                for(let key of Object.keys(configObj)) {
                    strStore[key] = JSON.stringify(configObj[key]);
                }
                return browser.storage.local.set(strStore);
            }
        }).catch(e => {
            console.error('storage.local.set failed!');
            console.error(e);
            Promise.reject(e);
        });
    }
}

/**
 * Get the whole config object
 */
function getConfig() {
    /**
     * sync method
     */
    return serializableObjectCloneDeep(configObj);
}

/**
 * Set the whole config object.
 * 
 * MUST be the WHOLE new config. This function simply does a **replacement** on the config object.
 * @param {object} newConfig 
 */
function setConfig(newConfig) {
    /**
     * sync method
     */
    var oldConfig = configObj;
    checkConfig(newConfig, configSchemaV1);
    configObj = serializableObjectCloneDeep(newConfig);
    enqueueConfigUpdate();
    return {
        oldConfig,
        newConfig
    };
}

/**
 * Return **sorted** sourceId list in an ascent order(according to "order" property)
 */
function getSourceIdList() {
    var res = Object.keys(configObj.sources);
    res.sort((a, b) => {
        return configObj.sources[a].order > configObj.sources[b].order;
    });
    return res;
}

function hasSourceId(sourceId) {
    return (configObj.sources.hasOwnProperty(sourceId));
}

/**
 * get sources
 * @param {Array} sourceIdList - an array of sourceId
 */
function getSources(sourceIdList) {
    if(!sourceIdList) {
        return serializableObjectCloneDeep(configObj.sources);
    }
    return sourceIdList.reduce((acc, curr) => {
        if(configObj.sources[curr])
            acc[curr] = serializableObjectCloneDeep(configObj.sources[curr]);
        return acc;
    }, {});
}

/**
 * Set sources
 * 
 * If sourceId exists, **only the properties defined for this sourceId will be update**; However **sourceDescription will not be merged but  REPLACED**
 * If sourceId does not exist, the new source will be added to sources. Order **WON'T** be set automatically nor be corrected.  
 * Structure of the object will be checked. Error will be thrown if check failed.
 * @param {object} sources An object {<sourceId> : {source},...}
 * @returns {object} {oldSources: {}, newSources: {}}
 */
function setSources(sources) {
    // TODO: replace and merge should be two seperate functions
    sources = serializableObjectCloneDeep(sources);
    var oldSources = getSources();
    for(let key of Object.keys(sources)) {
        if(oldSources[key]) {
            let newSource = serializableObjectCloneDeep(oldSources[key]);
            if(sources[key].hasOwnProperty('sourceDescription')) {
                // replace sourceDescription directly
                newSource.sourceDescription = sources[key].sourceDescription;
            }
            //console.log('old source');
            //console.log(tmpSource);
            _merge(newSource, sources[key]);
            //console.log('new source');
            //console.log(tmpSource);
            checkConfig(newSource, configSchemaV1.sources['<any>']);
            // set updated key
            configObj.sources[key] = newSource;
        } else {
            checkConfig(sources[key], configSchemaV1.sources['<any>']);
            // set new key
            configObj.sources[key] = serializableObjectCloneDeep(sources[key]);
        }
    }
    enqueueConfigUpdate();
    return {oldSources, newSources: getSources()};
}


/**
 * Delete a single source from config and idb
 * Order of the remaining sources **will be auto corrected**.
 * @async
 * @param {string} sourceId
 * @returns {promise} resolve a deleteCount
 */
async function asyncDeleteSource(sourceId) {
    if(!hasSourceId(sourceId)) return;
    if(!(delete configObj.sources[sourceId])) {
        throw new Error(sourceId + ' cannot be deleted from configObj');
    }
    // correct remaining order
    let remainingKeys = Object.keys(configObj.sources);
    remainingKeys.sort((ka, kb) => configObj.sources[ka].order > configObj.sources[kb].order);
    for(let [i, key] of remainingKeys.entries()) {
        configObj.sources[key].order = i;
    }
    enqueueConfigUpdate();
    return await db.articles
        .where(idbSchemaV1.articles.indices.sourceId.dexiePath)
        .equals(sourceId)
        .delete()
        .catch(e => {
            console.warn('Delete operation partially failed, but still deleted.');
            console.warn(e);
            return e.successCount;
        });
}

function getGlobalSettings() {
    return serializableObjectCloneDeep(configObj.globalSettings);
}

/**
 * Set the whole globalSettings property.  
 * 
 * This function does a **replacement** on the globalSettings property.
 * @param {object} newGlobalSettings 
 */
function setGlobalSettings(newGlobalSettings) {
    checkConfig(newGlobalSettings, configSchemaV1.globalSettings);
    var oldGlobalSettings = configObj.globalSettings;
    //configObj.globalSettings = _lang.cloneDeep(newGlobalSettings);
    // 确认bug由_lang.cloneDeep引起
    configObj.globalSettings = serializableObjectCloneDeep(newGlobalSettings);
    enqueueConfigUpdate();
    return {oldGlobalSettings, newGlobalSettings};
}

function getSharedField() {
    return serializableObjectCloneDeep(configObj.shared);
}

/**
 * Set the whole "shared" field.  
 * 
 * This function does a **replacement** on the "shared" field.
 * @param {any} newShared should be serializable
 */
function setSharedField(newShared) {
    checkConfig(newShared, configSchemaV1.shared);
    var oldShared = configObj.shared;
    configObj.shared = serializableObjectCloneDeep(newShared);
    enqueueConfigUpdate();
    return {oldShared, newShared};
}

/**
 * Insert batch of articles
 * @param {Array} articles - array of articles to be inserted or updated
 * @returns {Promise<{inserted: {Array}, updated: {Array}}>}
 */
function batchInsertOrUpdate(articles) {
    /**
     * Articles should be an Array of article
     * article should have the structure below:
     * {
     *  // the properties below are all required
     *  sourceId,
     *  firstSeen,
     *  originalWeight,
     *  key,
     *  
     *  versions: [{ // insertion of version participate in the update detection
     *      hasRead, // update strategy:
     *              old |  true  |  false  | (insert a new version)
     *            new   |        |         |
     * ------------------------------------------------
     *           true   |  true  |  true   |   true
     *          ---------------------------------------
     *           false  |  false |  false  |   false
     * ------------------------------------------------
     * null/undefined   |  true  |  false  |   false
     *      . Participate in the update detection.
     *      hash, // used to identify versions.
     *      firstSeen // used to sort the versions
     *  }],
     *  
     *  // optional
     *  read, // recalculated, participate in the update detection
     *  articleDate // recalculated, participate in the update detection
     * }
     * 
     * Update detection:
     * If articleId exists in DB,and it has one of the following operations:
     *  insert a new version
     *  hasRead changed
     * then the whole NEW article will be dispatched into "updated" result; else the unupdated article will NOT exist in updated
     * 
     * Inserting method:
     * If the first article of the catalog page has index 0, the last article of the catalog page has index articles.length - 1, then the insertion will be done from **the last to the first** to ensure that the first article will have the largest id.
     * 
     * return {inserted: [new articles], updated:[updated articles]}
     */
    if (!_lang.isArray(articles)) {
        throw new Error('articles must be an array');
    }
    // inserted有序而updated无序
    var result = {
        inserted: [],
        updated: []
    }

    articles = _lang.cloneDeep(articles);

    // merge articles with the same articleId from input
    // avoid articleId collision
    var articleMap = new Map();
    for(let article of articles) {
        let articleIdStr = article.sourceId + ',' + article.key;
        if(articleMap.has(articleIdStr)) {
            // merge these
            let prevArticle = articleMap.get(articleIdStr);
            let tmpRes = mergeUpdate(prevArticle, article);
            if(tmpRes.hasUpdate) {
                articleMap.set(articleIdStr, tmpRes.merged);
            }
        } else {
            articleMap.set(articleIdStr, article);
        }
    }
    articles = Array.from(articleMap.values());

    return db.transaction('rw', db.articles,
        async () => {
            var recs = await Promise.all(articles.map(article => {
                var articleId = [article.sourceId, article.key];

                var prom = db.articles
                .where(idbSchemaV1.articles.indices.articleId.dexiePath)
                .equals(articleId).first();

                prom.then(rec => {
                    // 如果存在则直接进行更新而不需要等待排序
                    if(rec) {
                        let tmpRes = mergeUpdate(rec, article);
                        if(tmpRes.hasUpdate) {
                            updateArticleFields(tmpRes.merged);
                            // tmpRes contains id
                            result.updated.push(tmpRes.merged);
                            return db.articles.put(tmpRes.merged);
                        }
                    }
                });
                // 返回get的promise
                return prom;
            }));
        // in the reverse order. the article with a small index must be at the top of the page, so it will be the last one to be inserted in order to get a large id.
        recs.reverse();
        await Promise.all(recs.map(async (rec, ri) => {
            if(!rec) {
                let i = articles.length - 1 - ri;
                let article = articles[i];
                updateArticleFields(article);
                // this should be executed in order
                let primaryKey = await db.articles.add(article);
                // now inserted article also has a id
                article.id = primaryKey;
                // sort id in descending order
                result.inserted.unshift(article);
            }
        }));
    }).then(() => {
        // sort id in descending order
        result.updated.sort((ar1, ar2) => ar1.id < ar2.id);

        return result;
    }).catch(e => {
        console.error('Batch insert or update failed.');
        console.error(e);
        throw e;
    });
}

/**
 * This function **will modify the arguments in place**
 * @param {object} oldArticle 
 * @param {object} newArticle 
 */
function mergeUpdate(oldArticle, newArticle) {
    var articleVersionsMap = new Map(oldArticle.versions.map(ver => [ver.hash, ver]));
    var hasUpdate = false;

    for(let ver of newArticle.versions) {
        if(articleVersionsMap.has(ver.hash)) {
            let oldVer = articleVersionsMap.get(ver.hash);
            if(ver.hasOwnProperty('hasRead')
                && _lang.isBoolean(ver.hasRead)
                && oldVer.hasRead !== ver.hasRead) {
                // let oldVer.hasRead = newVer.hasRead
                // directly modify the object in map
                oldVer.hasRead = ver.hasRead;
                hasUpdate = true;
            }
        } else {
            if(!ver.hasOwnProperty('hasRead') || ver.hasRead === undefined || ver.hasRead === null) {
                // if you haven't set a hasRead
                ver.hasRead = false;
            }
            articleVersionsMap.set(ver.hash, ver);
            hasUpdate = true;
        }
    }

    if(hasUpdate) {
        let newVersions = Array.from(articleVersionsMap.values());
        newVersions.sort((verA, verB) => verA.firstSeen > verB.firstSeen);
        let merged = oldArticle;
        merged.versions = newVersions;
        
        return {
            hasUpdate: true,
            merged
        };
    } else {
        return {
            hasUpdate: false
        };
    }
}

/**
 * This function **will modify the arguments in place**
 * @param {object} article 
 */
function updateArticleFields(article) {
    article.read = article.versions.every(ver => ver.hasRead)? 1 : 0;
    article.articleDate = article.versions.map(ver => ver.date);
}

/**
 * Simply set the versions in versionIndices of article(id=primaryKey) to be newStatus(default to be true)
 * @param {number} primaryKey article.id
 * @param {[number]} versionIndices array of changed versions' indices
 * @param {boolean} newStatus
 * @returns {promise} resolve with the number of updated articleId, reject with the Dexie.ModifyError
 */
async function updateReadStatus(primaryKey, versionIndices, newStatus=true) {
    return db.transaction('rw', db.articles, function() {
        return db.articles
            .where(idbSchemaV1.articles.key.dexiePath)
            .equals(primaryKey)
            .modify(function(val) {
                for(let i of versionIndices) {
                    if(i < val.versions.length) {
                        val.versions[i].hasRead = newStatus;
                    }
                }
                updateArticleFields(val);
            });
    });
}

/**
 * Simply get an article using primaryKey
 * @param {number} primaryKey article.id
 */
function getArticle(primaryKey) {
    return db.articles
        .get(primaryKey);
}

/**
 * Get primary key(id) of an article
 * @param {string} sourceId 
 * @param {string} key 
 */
function getPrimaryKey(sourceId, key) {
    return db.articles
        .where(idbSchemaV1.articles.indices.articleId.dexiePath)
        .equals([sourceId, key])
        .primaryKeys()
        .then(keys => keys[0]);
}

/**
 * Get the latest articles of sourceId with offset and step
 * @param {string} sourceId 
 * @param {number} offset
 * @param {number} step 
 * @returns {promise} promise will resolve a array of articles
 */
function getLatest(sourceId, offset = 0, step = 15) {
    // check https://github.com/dfahlander/Dexie.js/issues/411 for sorting with index
    return db.articles
        .where(idbSchemaV1.articles.indices.sourceId.dexiePath)
        .equals(sourceId)
        .reverse()
        .offset(offset)
        .limit(step)
        .toArray();
}

function getLatestUnread(sourceId, offset = 0, step = 15) {
    return db.articles
        .where(idbSchemaV1.articles.indices.read.dexiePath)
        .equals([sourceId, 0])
        .reverse()
        .offset(offset)
        .limit(step)
        .toArray();
}

/**
 * Filter all aritcles within date range
 * @param {Date} dateFrom Date object representing the start date (included)
 * @param {Date} dateTo Date object representing the end date (included)
 * @param {Number} offset 
 * @param {Number} step 
 */
function filterDate(sourceId, dateFrom, dateTo, offset = 0, step = 15) {
    return db.articles
        .where(idbSchemaV1.articles.indices.articleDate.dexiePath)
        .between(dateFrom, dateTo, true, true)
        .distinct()
        .filter(article => article.sourceId === sourceId)
        .offset(offset)
        .limit(step)
        .toArray();
}

/**
 * A multiple filter
 * @param {string} sourceId required
 * @param {boolean} unread optional, true for require unread, **false for no requirement**(does not mean requireing read)
 * @param {date} dateFrom optional, Dexie.minKey if omitted
 * @param {date} dateTo optional, Dexie.minKey if omitted
 * @param {number} offset optional
 * @param {number} step optional
 */
function multiFilter(sourceId, unread=false, {dateFrom=Dexie.minKey, dateTo=Dexie.maxKey, offset = 0, step = 15}) {
    if(dateFrom === Dexie.minKey && dateTo === Dexie.maxKey) {
        // no date specific
        if(unread) {
            return getLatestUnread(sourceId, offset, step);
        } else {
            return getLatest(sourceId, offset, step);
        }
    } else {
        // specific at least one date
        let query = db.articles
            .where(idbSchemaV1.articles.indices.articleDate.dexiePath)
            .between(dateFrom, dateTo, true, true)
            .distinct();
        if(unread) {
            query = query.filter(article => article.sourceId === sourceId && !article.read);
        } else {
            query = query.filter(article => article.sourceId === sourceId);
        }
        return query.offset(offset).limit(step).toArray();
    }
}

/**
 * Get last update result of sourceId.
 * @param {string} sourceId 
 * @returns {Promise<Object>} 
 */
function getLastUpdateResult(sourceId) {
    return db.lastUpdateResult.get(sourceId);
}

/**
 * Get all last update result.
 * @returns {Array}
 */
function getAllLastUpdateResult() {
    return db.lastUpdateResult.toArray();
}

/**
 * Set updateResult to idb.
 * @param {object} updateResult
 * @description updateResult should have the same structure as runtime events, except that it has a additional key named 'name', which contains the event name with which name this result is dispatched.
 */
function setLastUpdateResult(updateResult) {
    // 在使用inline-key的情况下不能使用那个optional的key参数，否则会报错
    return db.lastUpdateResult.put(updateResult);
}

function deleteLastUpdateResult(sourceId) {
    return db.lastUpdateResult.delete(sourceId);
}

function getFromSharedStore(key) {
    return db.sharedStore.get(key);
}

function putToSharedStore(key, value) {
    return db.sharedStore.put(value, key);
}

function modifyInSharedStore(key, cb) {
    return db.transaction('rw', db.sharedStore, async () => {
        var val = await getFromSharedStore(key);
        // You can modify val in-place; Or you can return a value as new val
        var ret = cb(val);
        if(ret) val = ret;
        await db.sharedStore.put(val, key);
    });
}

function deleteFromSharedStore(key) {
    return db.sharedStore.delete(key);
}

/**
 * Wrap mainFunc into a new function with checkInit executing before.
 * @param {function} mainFunc
 * @returns {function} wrapped function
 */
function checkInitedWrapper(mainFunc) {
    return function() {
        checkInited.call(this);
        return mainFunc.apply(this, arguments);
    }
}

let storageModule = {
    init,
    // local functions are sync functions(except the asyncDeleteSource), so if you do not await in your own function between a get and a set, you will automatically get a transaction on storage.local, and all changes will be applied immediately.
    local: {
        getConfig,
        setConfig,
        
        hasSourceId,
        getSourceIdList,
        
        getSources,
        setSources,
        asyncDeleteSource,
        
        getGlobalSettings,
        setGlobalSettings,

        getSharedField,
        setSharedField
    },
    db: {
        batchInsertOrUpdate,
        updateReadStatus,
        getArticle,
        getPrimaryKey,
        getLatest,
        getLatestUnread,
        filterDate,
        multiFilter,

        getLastUpdateResult,
        getAllLastUpdateResult,
        setLastUpdateResult,
        deleteLastUpdateResult,

        getFromSharedStore,
        putToSharedStore,
        modifyInSharedStore,
        deleteFromSharedStore,
    }
};

wrapModule(storageModule.local, checkInitedWrapper);
wrapModule(storageModule.db, checkInitedWrapper);

init();

export default storageModule;