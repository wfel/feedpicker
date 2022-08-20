import {
    makeRetry,
    Semaphore
} from '../utils/promise-enhance';
import {
    UnsuccessResult,
    SuccessResult
} from '../utils/result-def';
import axios from 'axios';

var threadsSemaphore = new Semaphore(5);

async function getParsedDocumentV2(fullUrl, {
    withCredentials = false,
    autoRedirect = true,
    timeout = 10000,
    retries = 3
}) {
    /**
     * 
     * return UnsuccessResult
     *  -1: resquest timeout
     *  0: response not OK
     *  1: Respond OK but Failed to parse response
     * 
     *  */
    const acceptMIMETypes = ['text/html', 'text/xml', 'application/xhtml+xml', 'application/xml'];
    let config = {
        url: fullUrl,
        method: 'get',
        headers: {
            'Accept': acceptMIMETypes.join(',')
        },
        timeout, // ms
        validateStatus: function (status) {
            return status >= 200 && status < 599; // 599: This status code is not specified in any RFCs, but is used by some HTTP proxies to signal a network connect timeout behind the proxy to a client in front of the proxy.
        },
        withCredentials: withCredentials,
        responseType: 'document',
        maxRedirects: autoRedirect? 5 : 0
    };


    // todo: 服务器400或500时是否应该retry
    let response;
    try {
        response = await makeRetry(retries, () => axios(config));
    } catch (e) {
        if (e.code == 'ECONNABORTED')
            // a timeout
            return new UnsuccessResult(-1, 'Timeout', e.request);
        else
            throw e;
    }

    if (response.status < 200 || response.status >= 300)
        return new UnsuccessResult(0, 'Server responds not OK', response);

    if (!response.data)
        return new UnsuccessResult(1, 'Respond OK but failed to parse response.', response);

    // process the URLs into absolute URLs
    let doc = response.data;
    var srcElems = doc.querySelectorAll('[src]');
    [].forEach.call(srcElems, elem => {
        elem.src = '' + elem.src;
    });
    var hrefElems = doc.querySelectorAll('[href]');
    [].forEach.call(hrefElems, elem => {
        elem.href = '' + elem.href;
    });
    
    return new SuccessResult(doc);
}

let exportList = {
    getParsedDocumentV2
};

for(let funcName of Object.keys(exportList)) {
    let originalFunc = exportList[funcName];
    exportList[funcName] = async function() {
        await threadsSemaphore.P();

        var res, err, errFlag = false;

        try {
            res = await originalFunc.apply(this, arguments);
        } catch(e) {
            errFlag = true;
            err = e;
        }

        threadsSemaphore.V();
        
        if(errFlag) {
            throw err;
        } else {
            return res;
        }
    }
}

export default exportList;