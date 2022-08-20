/**
 * Locate target index in arr with custom compare function. If the arr is consumed but none is found, return -1.
 * arr is assumed to be in order. The order will be auto detected.
 * @param {array} arr 
 * @param {any} target 
 * @param {function(a, b):number} compFunc Compare function for array of the same type as target. Should return: n < 0 for a < b; n == 0 for a = b; n > 0 for a > b. (总之a < b与a > b时函数的返回值异号就行)
 */
function binarySearch(arr, target, compFunc) {
    if(arr.length <= 0) return -1;
    if(arr.length === 1) {
        if(compFunc(arr[0], target) === 0) {
            return 0;
        } else {
            return -1;
        }
    }
    var lb = 0, ub = arr.length - 1, mid = getMid(lb, ub), order;
    var tmpCompRes = compFunc(arr[lb], arr[ub]);

    // determine arr order
    if(tmpCompRes === 0) {
        // all of the elements have the same value
        if(compFunc(arr[mid], target) === 0) {
            return mid;
        } else {
            return -1;
        }
    } else if(tmpCompRes > 0) {
        // arr is in descent order
        order = -1;
    } else {
        // arr is in ascent order
        order = 1;
    }

    // the new compare function
    var comp = (a, b) => order * compFunc(a, b);

    tmpCompRes = comp(target, arr[lb]);
    // check lower boundary
    if(tmpCompRes === 0) {
        return lb;
    } else if(tmpCompRes < 0) {
        return -1;
    } else {
        ++lb;
    }

    // check upper boundary
    tmpCompRes = comp(arr[ub], target);
    if(tmpCompRes === 0) {
        return ub;
    } else if(tmpCompRes < 0) {
        return -1;
    } else {
        --ub;
    }

    mid = getMid(lb, ub);
    while(lb < ub) {
        tmpCompRes = comp(target, arr[mid]);
        if(tmpCompRes === 0) {
            return mid;
        } else if(tmpCompRes > 0) {
            lb = mid + 1;
            mid = getMid(lb, ub);
        } else {
            if(mid == lb) return -1;
            ub = mid - 1;
            mid = getMid(lb, ub);
        }
    }
    tmpCompRes = comp(target, arr[mid]);
    if(tmpCompRes === 0) {
        return mid;
    } else {
        return -1;
    }
}

function getMid(ia, ib) {
    return Math.floor((ia + ib) / 2);
}

export {
    binarySearch
}