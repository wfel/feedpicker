import murmur3 from '../utils/murmur-wrapper';
import {
    convertKeyV2ToKeyV1
} from '../crawler-core/crawler';

/**
 * Convert article format from crawler to storage.
 * @param {Array} articles articles returned from crawler
 * @param {string} sourceId 
 * @param {Date} firstSeen
 */
function convertArticleFormat(articles, sourceId, firstSeen) {
    var len = articles.length;
    var partiallyFailed = false;
    var successArticles = [], failedArticles = [];
    articles.forEach(article => {
        if(article.key.includes(undefined) || article.key.includes(null)
            || article.hash.includes(undefined) || article.hash.includes(null)) {
            // 如果结果中有undefined或null，则无法建立key或hash
            partiallyFailed = true;
            failedArticles.push(article);
        } else {
            successArticles.push(article);
        }
    });
    successArticles = successArticles.map((article, i) => {
        var storeArticle = {};
        storeArticle.sourceId = sourceId;
        storeArticle.firstSeen = new Date(firstSeen);
        storeArticle.originalWeight = len - i;
        storeArticle.key = murmur3(convertKeyV2ToKeyV1(article.key));
        storeArticle.versions = [Object.assign({}, article, {
            hasRead: null,
            date: new Date(article.date),
            hash: murmur3(convertKeyV2ToKeyV1(article.hash)),
            firstSeen: new Date(firstSeen)
        })];
        return storeArticle;
    });
    failedArticles = failedArticles.map(article => ({title: article.title, link: article.link}));
    return {
        partiallyFailed,
        successArticles,
        failedArticles
    };
}

export {
    convertArticleFormat
};