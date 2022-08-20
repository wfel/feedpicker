import storage from '../storage-core/storage';
import {
    crawl
} from '../crawler-core/crawler';
import murmur3 from '../utils/murmur-wrapper';
import {
    convertArticleFormat
} from './help-functions';

import {
    allFulfilledV2
} from '../utils/promise-enhance';

import {
    dispatchRuntimeMessage
} from '../utils/browser-runtime-events';

import {
    SuccessResult,
    UnsuccessResult
} from '../utils/result-def';

/**
 * Wrapper of storage.local.setGlobalSettings, with a send message to runtime to synchronize changes
 * @param {object} newGlobalSettings 
 */
function setGlobalSettings(newGlobalSettings) {
    var result = storage.local.setGlobalSettings(newGlobalSettings);
    dispatchRuntimeMessage('globalSettings:update', result);
    return result;
}

/**
 * Insert a new source
 * 
 * As a side effect, all of the other sources' orders will be normalized.
 * @param {object} sourceDescription the crawler souce description
 * @param {string} displayName name that will be displayed in source list
 * @param {boolean} updatePaused determine if it should be **auto** updated(it will not affect manually update)
 */
function createSource(sourceDescription, displayName, updatePaused = false) {

    // generate new sourceId
    var newSourceId = murmur3('' + displayName + Math.random());
    for (var retryCount = 0; storage.local.hasSourceId(newSourceId) && retryCount < 500; ++retryCount) {
        newSourceId = murmur3('' + displayName + Math.random());
    }
    if (retryCount >= 500) {
        throw new Error('Cannot get a new sourceId after 500 retries');
    }

    // construct newSource
    var sourceIdList = storage.local.getSourceIdList();
    var newSource = {
        sourceDescription,
        lastUpdate: (new Date(0)).toISOString(),
        storageKey: newSourceId,
        settings: {
            order: sourceIdList.length,
            displayName,
            updatePaused
        }
    };

    var modifiedSources = {
        [newSourceId]: newSource
    };
    for (let [i, key] of sourceIdList.entries()) {
        modifiedSources[key] = {
            settings: {
                order: i
            }
        };
    }
    var {
        newSources
    } = storage.local.setSources(modifiedSources);

    dispatchRuntimeMessage('sources:update', newSources);

    return newSources[newSourceId];
}

/**
 * Return **order normalized** remaining sources
 * @param {string} sourceId 
 */
async function deleteSource(sourceId) {
    var deleteCount = await storage.local.asyncDeleteSource(sourceId);
    if (deleteCount === undefined) {
        console.warn('deleteSource: probably does not have the source: ' + sourceId);
    }
    storage.db.deleteLastUpdateResult(sourceId);
    storage.db.modifyInSharedStore('lastGlobalUpdateResult', arr => {
        for(let [i, res] of arr.entries()) {
            if(res.sourceId === sourceId) {
                arr.splice(i, 1);
                break;
            }
        }
    });
    dispatchRuntimeMessage('source:delete', sourceId);
    return sourceId;
}

/**
 * Update the setting of sourceId and/or source description of sourceId
 * 
 * 'order' in source will **not** be checked! It is much prefered to set new order using 'relocateSource'
 * @param {string} sourceId 
 * @param {object} newSourceDescription
 * @param {object} newSettings 
 */
function updateSource(sourceId, newSettings, newSourceDescription) {
    if (!storage.local.hasSourceId(sourceId)) {
        console.warn('updateSource: possibly wrong sourceId: ' + sourceId);
        return;
    }
    var updatedPart = {};
    if(newSettings) {
        updatedPart.settings = newSettings;
    }
    if(newSourceDescription) {
        updatedPart.sourceDescription = newSourceDescription;
    }
    var {
        newSources
    } = storage.local.setSources({
        [sourceId]: updatedPart
    });

    dispatchRuntimeMessage('sources:update', newSources);

    return newSources;
}

/**
 * All of the sources' **orders** are **normalized**.
 * @param {object} newSourcesOrder [sourceId, sourceId, ...]
 */
function relocateSource(newSourcesOrder) {
    // in descending order
    var sourceIdSet = new Set(storage.local.getSourceIdList().reverse());
    var newSourceIdSet = new Set(newSourcesOrder.reverse());
    // calculate intersection of two sets into newSourceIdSet
    for(let sourceId of sourceIdSet) {
        if(!newSourceIdSet.has(sourceId))
            newSourceIdSet.add(sourceId);
    }
    for(let sourceId of newSourceIdSet) {
        if(!sourceIdSet.has(sourceId)) {
            newSourceIdSet.delete(sourceId);
        }
    }

    var newSourceIdList = Array.from(newSourceIdSet.values()).reverse();

    var newSources = {};
    newSourceIdList.forEach((sourceId, i) => {
        newSources[sourceId] = {
            settings: {
                order: i
            }
        };
    })

    storage.local.setSources(newSources);

    dispatchRuntimeMessage('sources.settings.order:update', newSourceIdList);

    return newSourceIdList;
}

// 一个全局的更新记录。key: sourceId, value: Promise of the update
var currUpdatingMap = new Map();

function dispatchAndSave(name, updateResult) {
    dispatchRuntimeMessage(name, updateResult);
    return storage.db.setLastUpdateResult(Object.assign({}, updateResult, {name}));
}

/**
 * Update articles to idb
 * @param {array} sourceIdList An array of sourceId. If not specific, all of the sources will be updated no matter which value of its settings.updatePaused is.
 * @returns {promise} resolve to an array of result
 * @description result of resultArr:  
 * ```
 * {
 *      sourceId,
 *      state: <boolean>, true for no error(success or warning), false for error(renewError)
 *      result: an Error object(state: false) , or {
 *          partiallyFailed: convertionResult.partiallyFailed,
 *          failedArticles: convertionResult.failedArticles,
 *          dbResult: {
 *              inserted: [], // an array of inserted(new) articles(have the record primaryKey(which is 'id') of object-store)
 *              updated: [] // an array of updated articles
 *          }
 *      }
 * }
 * ```
 */
async function updateArticles(sourceIdList) {
    if (!sourceIdList) {
        sourceIdList = storage.local.getSourceIdList();
    } else {
        sourceIdList = sourceIdList.filter(sourceId => storage.local.hasSourceId(sourceId));
    }

    var sources = storage.local.getSources();
    var firstSeen = new Date();
    var proms = sourceIdList
        .map((sourceId) => {
            // check if an updating is already excuting
            if(currUpdatingMap.has(sourceId)) {
                return currUpdatingMap.get(sourceId);
            } else {
                return (async () => {
                    // crawler
                    var result;
                    try {
                        result = await crawl(sources[sourceId].sourceDescription);
                    } catch(e) {
                        // wrong source description
                        result = new UnsuccessResult(-2, e.message, e);
                    }
    
                    // result manipulation
                    if(result instanceof UnsuccessResult) {
                        // crawling failed
                        console.error(result.error);
                        // Error对象不能被sendMessage发送
                        await dispatchAndSave('source:renewError', {
                            sourceId,
                            errMsg: result.error.message
                        });

                        throw result.error;
                    } else {
                        let articles = result.data;
                        // These converted articles will all get the same sourceId
                        let convertionResult = convertArticleFormat(articles, sourceId, firstSeen);
                        // dbResult is {inserted: [], updated: []}
                        let dbResult;
                        try {
                            dbResult = await storage.db.batchInsertOrUpdate(convertionResult.successArticles);
                        } catch(e) {
                            // can have error
                            await dispatchAndSave('source:renewError', {
                                sourceId,
                                errMsg: e.message
                            });
                            throw e;
                        }
    
                        // sync pages
                        dispatchRuntimeMessage('articles:update', {
                            sourceId,
                            // result should be {inserted: [], updated: []}
                            result: dbResult
                        });
                        // renew source.lastUpdate to storage.local
                        storage.local.setSources({
                            [sourceId]: {
                                lastUpdate: firstSeen.toISOString()
                            }
                        });
                        if(convertionResult.partiallyFailed) {
                            await dispatchAndSave('source:renewWarning', {
                                sourceId,
                                lastUpdate: firstSeen.toISOString(),
                                failedArticles: convertionResult.failedArticles
                            });
                        } else {
                            await dispatchAndSave('source:renewSuccess', {
                                sourceId,
                                lastUpdate: firstSeen.toISOString()
                            });
                        }
                        return {
                            partiallyFailed: convertionResult.partiallyFailed,
                            failedArticles: convertionResult.failedArticles,
                            dbResult
                        };
                    }
                })();
            }
        });
    
    sourceIdList.forEach((sourceId, i) => {
        if(!currUpdatingMap.has(sourceId)) {
            // Proclaiming that I'm renewing!
            dispatchRuntimeMessage('source:renewBegin', sourceId);
            currUpdatingMap.set(sourceId, proms[i]);
            proms[i].then(() => {
                // finally
                dispatchRuntimeMessage('source:renewEnd', sourceId);
                currUpdatingMap.delete(sourceId);
            }).catch(() =>{ 
                // finally
                dispatchRuntimeMessage('source:renewEnd', sourceId);
                currUpdatingMap.delete(sourceId);
            });
        }
    });
    var resultArr = await allFulfilledV2(proms);
    // modify in-place
    resultArr.forEach((result, i) => {
        result.sourceId = sourceIdList[i];
    });
    return resultArr;
}

/**
 * Get sourceIdList that are currently renewing.
 * @returns {Array} sourceIdList that are renewing
 */
function getRenewingList() {
    // Map.keys()返回一个iterator
    return [...currUpdatingMap.keys()];
}

/**
 * Wrapper of storage.db.updateReadStatus
 */
async function updateReadStatus(primaryKey, versionIndices, newStatus=true) {
    var res = await storage.db.updateReadStatus.apply(this, arguments);
    dispatchRuntimeMessage('articles.read:update', {
        primaryKey,
        versionIndices,
        newStatus
    });
    return res;
}

let wrappedFuncs = {
    // init should always be called before anything else
    init: storage.init,
    getGlobalSettings: storage.local.getGlobalSettings,
    setGlobalSettings,
    getSharedField: storage.local.getSharedField,
    setSharedField: storage.local.setSharedField,

    getSources: storage.local.getSources,
    getSourceIdList: storage.local.getSourceIdList,
    createSource,
    deleteSource,
    updateSource,
    relocateSource,

    updateArticles,
    getRenewingList,
    getArticle: storage.db.getArticle,
    getPrimaryKey: storage.db.getPrimaryKey,
    getLatestArticles:storage.db.getLatest,
    getLatestUnreadArticles: storage.db.getLatestUnread,
    getArticlesWithinDate: storage.db.filterDate,
    multiFilter: storage.db.multiFilter,
    updateReadStatus,
    getLastUpdateResult: storage.db.getLastUpdateResult,
    getAllLastUpdateResult: storage.db.getAllLastUpdateResult,

    getFromSharedStore: storage.db.getFromSharedStore,
    putToSharedStore: storage.db.putToSharedStore,
    deleteFromSharedStore: storage.db.deleteFromSharedStore,
};

export default wrappedFuncs;