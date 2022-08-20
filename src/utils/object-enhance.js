function objOfArr2ArrOfObj(obj, nameMap = {}) {
    /**
     * Turn {a: [1, 2], b: [3, 4]} into [{a: 1, b:3}, {a: 2, b: 4}]
     * There must be at least one Array, or it will return [obj]
     * length must all be equal
     * non-array values will be copied into each generated object
     */
    let result = [];
    let keys = Object.keys(obj);
    let isArray = [];
    let length;

    for (let key of keys) {
        if (obj[key] instanceof Array) {
            isArray.push(true);
            if (length === undefined)
                length = obj[key].length;
            else if (length !== obj[key].length)
                throw new Error('Length of Array not match');
        } else {
            isArray.push(false);
        }
    }

    // no Array in obj
    if (length === undefined) return [obj];

    for (var i = 0; i < length; ++i) {
        let tmpObj = {};
        keys.forEach((key, j) => {
            let reskey = key;
            if (nameMap.hasOwnProperty(key)) reskey = nameMap[key];
            if (isArray[j])
                tmpObj[reskey] = obj[key][i];
            else
                tmpObj[reskey] = obj[key];
        });
        result.push(tmpObj);
    }
    return result;
}

export {
    objOfArr2ArrOfObj
};