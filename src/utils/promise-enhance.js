import {
    objOfArr2ArrOfObj
} from './object-enhance';

function allFulfilled(arrayOfPromises) {
    // utils
    // return {results: [], states: []}, true for resolved and false for rejectd
    // This function will always be pending or resolved, never be rejected
    const totalCount = arrayOfPromises.length;
    if(!totalCount) return Promise.resolve([]);
    var fulfilledCount = 0;
    var resultArray = [];
    resultArray.length = totalCount;
    var resultStateArray = [];
    resultStateArray.length = totalCount;

    return new Promise((resolve, reject) => {
        arrayOfPromises.forEach((prom, index) => {
            // if all browser support finally callback then this should go to finally
            let finallyHandler = whatEver => {
                resultArray[index] = whatEver;
                fulfilledCount++;
                if (fulfilledCount === totalCount) {
                    resolve(objOfArr2ArrOfObj({
                        results: resultArray,
                        states: resultStateArray
                    }, {results: 'result', states: 'state'}));
                }
            }

            prom.then(result => {
                resultStateArray[index] = true;
                finallyHandler(result);
            }).catch(e => {
                resultStateArray[index] = false;
                finallyHandler(e);
            });
        });
    });
}

async function allFulfilledV2(arrayOfPromises) {
    // should be the same with allFulfilled
    var resultArray = [];
    var resultStateArray = [];
    for(let prom of arrayOfPromises) {
        try{
            resultArray.push(await prom);
            resultStateArray.push(true);
        } catch(e) {
            resultArray.push(e);
            resultStateArray.push(false);
        }
    }
    return objOfArr2ArrOfObj({
        results: resultArray,
        states: resultStateArray
    }, {results: 'result', states: 'state'});
}

/**
 * Call func for at most maxRetries times.
 * @param {number} maxRetries 
 * @param {function} func 
 * @description This function will resolve when func succeeds. If func rejects, then func will be called again until it has been called for  maxRetries. If func rejects on the last call, the whole function rejects.
 */
async function makeRetry(maxRetries, func) {
    // utils
    // retry when error or reject was caught
    var retryCount = 0;
    var result;
    while (retryCount < maxRetries) {
        try {
            result = await func();
            return result;
        } catch (e) {
            retryCount++;
            if (retryCount >= maxRetries)
                throw e;
        }
    }
}

/**
 * Introduce Semaphore into js
 */
class Semaphore {
    /**
     * Constructor(and initializer) of Semaphore
     * @param {number} maxNum max number of resource
     */
    constructor(maxNum) {
        this._semaphore = maxNum;
        this._waitingList = [];
    }

    /**
     * @returns {promise} resolve when resource available
     */
    P() {
        if(this._semaphore <= 0) {
            return new Promise((resolve) => {
                this._waitingList.push(resolve);
            });
        } else {
            this._semaphore--;
            return Promise.resolve();
        }
    }

    V() {
        if(this._waitingList.length > 0) {
            var resolve = this._waitingList.shift();
            setTimeout(resolve, 0);
        } else {
            this._semaphore++;
        }
    }
}

export {
    allFulfilled,
    allFulfilledV2,
    makeRetry,
    Semaphore
};