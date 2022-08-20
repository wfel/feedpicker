import moment from 'moment-timezone/builds/moment-timezone-with-data-2012-2022.min';
import * as Url from 'url-parse';
import * as _lang from 'lodash/lang';

import {
    UnsuccessResult,
    SuccessResult
} from '../utils/result-def';
import {
    allFulfilledV2,
} from '../utils/promise-enhance';
import {
    objOfArr2ArrOfObj
} from '../utils/object-enhance';
import {
    patternMaker,
    checkSourceDescription
} from './help-functions';
import network from './network';

function crawlFromCatalog(doc, selector, pattern) {
    let tmp = [...doc.querySelectorAll(selector)];
    return tmp.map(patternMaker(pattern));
}

function crawlFromContents(pages, selector, pattern) {
    return pages.map(page => {
        if (page.hasDocument) {
            // it contains the document
            let titleElem = page.doc.querySelector(selector);
            return patternMaker(pattern)(titleElem);
        } else {
            return null;
        }
    });
}

function getLength(crawlResult) {
    switch(true) {
        case _lang.isArray(crawlResult.link):
        return crawlResult.link.length;
        case _lang.isArray(crawlResult.title):
        return crawlResult.title.length;
        case _lang.isArray(crawlResult.content):
        return crawlResult.content.length;
        case _lang.isArray(crawlResult.date):
        return crawlResult.date.length;
        default:
        throw 'None of the non-key/hash property of crawlResult is an Array';
    }
}

async function crawl(sourceDescription) {
    // todo: accept a desctruction assignment

    /**
     * If success, return SuccessResult
     * throw an error if the sourceDescription is possibly wrong, else return a UnsuccessResult
     * errcode -1: network error, catalog server unreachable or catalog page response not OK
     * errcode 0: respond not OK
     * errcode 1: failed to parse catalog page
     * 
     */
    checkSourceDescription(sourceDescription);
    const maxRetriesPerPage = 3;
    const baseURL = Url(sourceDescription.catalogURL).origin;
    // fields should be undefined if it is undefined or null in sourceDescription; **should be null if encountered an error**
    var crawlResult = {
        link: undefined,
        title: undefined,
        date: undefined, // <string>, ISO date string
        content: undefined,
        key: undefined,
        hash: undefined
    }

    var catalogDoc;
    var contentPages = [];
    var tmpResult;

    tmpResult = await network.getParsedDocumentV2(sourceDescription.catalogURL, {
        retries: maxRetriesPerPage
    });
    if (!tmpResult.success) {
        if (tmpResult.error.code === 1) {
            // parse error
            console.error('Parse error: unable to parse catalog');
            throw tmpResult.error;
        } else {
            console.warn('Other error');
            return tmpResult;
        }

    }

    catalogDoc = tmpResult.data;

    // links can only be: undefined or Array
    if (sourceDescription.link) {
        // Attention: there could be no link; all of the content are on the same page
        crawlResult.link = crawlFromCatalog(catalogDoc,
            sourceDescription.link.selector,
            sourceDescription.link.pattern
        ).map(link => _lang.isString(link)?Url(link, baseURL).href:link);
    }

    switch (true) {
        case (sourceDescription.title && sourceDescription.title.from === 'link'):
        case (sourceDescription.date && sourceDescription.date.from === 'link'):
        case (sourceDescription.content && sourceDescription.content.from === 'link'):
        case (sourceDescription.hash && sourceDescription.hash.includes('link')):
        case (sourceDescription.key && sourceDescription.key === 'link'):
            {
                // fetch content page
                if (crawlResult.link === undefined) {
                    let errMsg = '"link" property probably missed from the description';
                    console.error(errMsg);
                    throw new Error(errMsg);
                }
                let docsPromises = crawlResult.link.map(link => {
                    if(link)
                    {
                        return network.getParsedDocumentV2(link, {
                            retries: maxRetriesPerPage
                        });
                    } else {
                        console.error(`link is ${link}`);
                        return Promise.reject();
                    }
                });
                // wait for all promises to be either resolved or rejected
                let resultArr = await allFulfilledV2(docsPromises);
                // there can be some of them failed, and what to do?
                // recall that if the result is not a document, it can also fail
                // we can ignore the failures until calculating the keys
                contentPages = [];
                for(let {result, state} of resultArr) {
                    // status: 0 - have a document; 1 - unknown error ; 2 - server respond not OK | failed to parse result | network error
                    let tmpResult;
                    if (!state) {
                        // unknown error
                        tmpResult = {
                            hasDocument: false,
                            status: 1
                        };
                    } else {
                        if (!result.success)
                            tmpResult = {
                                hasDocument: false,
                                status: 2
                            }
                        else
                            tmpResult = {
                                hasDocument: true,
                                status: 0,
                                doc: result.data
                            };
                    }
                    contentPages.push(tmpResult);
                }
            }
    }

    function crawlField(field) {
        // The result MUST either be undefined, or be an array with the same length as links
        let tmpResult;
        if (field.from === 'catalog') {
            tmpResult = crawlFromCatalog(catalogDoc, field.selector, field.pattern);

            // check if number matches
            if (crawlResult.link && (crawlResult.link.length !== tmpResult.length)) {
                let errMsg = `Count of links and fields not match: ${crawlResult.link.length}, ${tmpResult.length}`;
                console.error(errMsg)
                throw new Error(errMsg);
            }
        } else if (field.from === 'link') {
            tmpResult = crawlFromContents(contentPages, field.selector, field.pattern);
            // will always be the same number as links
        }
        return tmpResult;
    }

    if (sourceDescription.title) {
        crawlResult.title = crawlField(sourceDescription.title);
    }

    if (sourceDescription.content) {
        crawlResult.content = crawlField(sourceDescription.content);
    }

    if (sourceDescription.date) {
        if(sourceDescription.date.from === 'now') {
            // 特判
            crawlResult.date = Array(getLength(crawlResult)).fill((new Date()).toISOString());
        } else {
            crawlResult.date = crawlField(sourceDescription.date);
            // use moment-timezone
            crawlResult.date = crawlResult.date.map(date => {
                var mdate = moment.tz(date, sourceDescription.date.format, sourceDescription.date.timeZone);
                if (!mdate.isValid()) {
                    let errMsg = `Not a valid date: ${ date }`;
                    console.error(errMsg);
                    throw new Error(errMsg);
                }
                return mdate.toISOString();
            });
        }
    }

    function constructKeys(keywords) {
        // Deprecated
        /**
         *  crawlResult[keyword]   undefined    |   array2
         *      result                          | 
         * -----------------------------------------------
         *     undefined          'undefined'   |   array2
         * -----------------------------------------------
         *      string      string+',undefined' |   array2.map(val=> string + ',' + val)
         * -----------------------------------------------
         *      array1  array1.map(val=> val + ',undefined') | array1.map((val, index)=> val + ',' + array2[index])
         */
        let result;
        for (let keyword of keywords) {
            // keys will be concatenated together(as a string)
            if (result === undefined) {
                if (crawlResult[keyword] === undefined)
                    result = 'undefined';
                else
                    result = crawlResult[keyword];
            } else if (_lang.isString(result)) {
                if (crawlResult[keyword] === undefined)
                    result += ',undefined';
                else
                    result = crawlResult[keyword].map(key => result + ',' + key);
            } else {
                if (crawlResult[keyword] === undefined)
                    result = result.map(key => key + ',undefined');
                else
                    result = result.map((key, index) => key + ',' + crawlResult[keyword][index]);
            }
        }
        return result;
    }

    function constructKeysV2(keywords) {
        var result = [];
        var resultLen = getLength(crawlResult);
        
        result.length = resultLen;
        for(var i = 0; i < resultLen; ++i) {
            result[i] = [];
        }
        for(let keyword of keywords) {
            if(_lang.isArray(crawlResult[keyword])) {
                result.forEach((res, i) => res.push(crawlResult[keyword][i]));
            } else {
                result.forEach(res => res.push(crawlResult[keyword]));
            }
        }
        return result;
    }

    crawlResult.key = constructKeysV2(sourceDescription.key);
    // key can be the same, but it will be filtered by storage module
    // if (crawlResult.key === undefined || _lang.isString(crawlResult.key)) {
    //     let errMsg = 'No valid key';
    //     console.error(errMsg);
    //     throw new Error(errMsg);
    // }

    crawlResult.hash = constructKeysV2(sourceDescription.hash);
    // if (crawlResult.hash === undefined || _lang.isString(crawlResult.hash)) {
    //     //then assign each key with this 'undefined' or string
    //     crawlResult.hash = crawlResult.key.map(() => crawlResult.hash === undefined ? 'undefined' : crawlResult.hash);
    // }

    return new SuccessResult(objOfArr2ArrOfObj(crawlResult));
}

/**
 * Convert an array of string to string
 * @param {array} keywordList
 * @returns {string}
 */
function convertKeyV2ToKeyV1(keywordList) {
    return keywordList.reduce((prev, curr) => prev + ',' + curr, '').slice(1);
}

export {
    crawl,
    convertKeyV2ToKeyV1
}