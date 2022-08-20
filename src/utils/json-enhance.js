/**
 * Replacer function for JSON.stringify
 * It can parse date to an Object with a special structure
 * @param {string} k 
 * @param {any} v 
 */
function replacer(k, v) {
    if(typeof v === 'object' && v !== null) {
        for(let key of Object.keys(v)) {
            if(v[key] instanceof Date) {
                v[key] = {
                    '[original]': 'date',
                    '[transformed]': v[key].toISOString()
                }
            }
        }
    }
    return v;
}

/**
 * Pair function to replacer
 * @param {string} k 
 * @param {any} v 
 */
function reviver(k, v) {
    if(typeof v === 'object' && v !== null && v.hasOwnProperty('[original]') && v.hasOwnProperty('[transformed]')) {
        switch(v['[original]']) {
            case 'date':
            return new Date(v['[transformed]']);
            default:
            return v;
        }
    } else {
        return v;
    }
}

function safeJSONstringify(obj) {
    return JSON.stringify(obj, replacer);
}

function safeJSONparse(str) {
    return JSON.parse(str, reviver);
}

export {
    replacer,
    reviver,
    safeJSONstringify,
    safeJSONparse
};