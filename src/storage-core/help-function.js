import * as _lang from 'lodash/lang';

function formatKeyPath(keyPath) {
    if (_lang.isString(keyPath)) {
        return keyPath;
    } else if (_lang.isArray(keyPath) && keyPath.every(val => _lang.isString(val))) {
        return '[' + keyPath.join('+') + ']';
    }
    return '';
}

function formatIndex(indexSchema) {
    var result = ',';
    if(indexSchema.params) {
        if(indexSchema.params.unique) {
            result += '&';
        } else if(indexSchema.params.multiEntry) {
            result += '*';
        }
    }
    result += formatKeyPath(indexSchema.path);
    return result;
}

function formatSchema(rawSchema) {
    var resultStr = '';
    if (rawSchema.key) {
        if (rawSchema.key.autoIncrement) {
            resultStr += '++';
        }
        if (rawSchema.key.path) {
            resultStr += formatKeyPath(rawSchema.key.path);
        }
    }
    if(rawSchema.indices) {
        for(let val of Object.values(rawSchema.indices)) {
            resultStr += formatIndex(val);
        }
    }
    return resultStr;
}

class DexieStoreSchema {
    constructor(rawSchema) {
        Object.assign(this, rawSchema);
        this.schema = formatSchema(rawSchema);
        if(this.key) {
            this.key.dexiePath = formatKeyPath(this.key.path);
        }
        if(this.indices) {
            for(let val of Object.values(this.indices)) {
                val.dexiePath = formatKeyPath(val.path);
            }
        }
    }
}

function serializableObjectCloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function createConfigV1() {
    return {
        configVersion: 1,
        idbVersion: 1,
        sources: {},
        globalSettings: {
            ver: 1,
            updateInterval: 720,
            useBadge: true
        },
        shared: {
            lastGlobalUpdate: (new Date(0)).toISOString()
        }
    }
}

function checkConfigV1(config, configSchema, errPrefix = 'config') {
    // buggy, deprecated
    if(!_lang.isObjectLike(config)) {
        throw new Error(errPrefix + ` must be an object like`);
    }
    for(let key of Object.keys(configSchema)) {
        if(key === '<any>') {
            // it means any value of key-value pair in config object should match the '<any>' object schema
            for(let val of Object.values(config)) {
                checkConfig(val, configSchema['<any>'], errPrefix + '.<any>');
            }
        } else {
            if(!(key in config)) {
                throw new Error(errPrefix + `.${key} does not exist`);
            }
            // check value
            if(typeof configSchema[key] === 'string') {
                var strVal = configSchema[key];
                switch(strVal) {
                    case '<any>':
                    break;
                    case '<array>':
                    if(!_lang.isArray(config[key])) {
                        throw new Error(errPrefix + `.${key} must be an array`);
                    }
                    break;
                    case '<object>':
                    if(!_lang.isObjectLike(config[key])) {
                        throw new Error(errPrefix + `.${key} must be an object like`);
                    }
                    break;
                    case '<string>':
                    if(!_lang.isString(config[key])) {
                        throw new Error(errPrefix + `.${key} must be a string`);
                    }
                    break;
                    case '<boolean>':
                    if(!_lang.isBoolean(config[key])) {
                        throw new Error(errPrefix + `.${key} must be a boolean`);
                    }
                    break;
                    case '<number>':
                    if(!_lang.isNumber(config[key])) {
                        throw new Error(errPrefix + `.${key} must be a number`);
                    }
                    break;
                    default:
                    if(config[key] !== configSchema[key]) {
                        throw new Error(errPrefix + `.${key} must be "${configSchema[key]}"`);
                    }
                }
            } else if (_lang.isArray(configSchema[key])) {
                if(!_lang.isArray(config[key])) {
                    throw new Error(errPrefix + `.${key} must be an array`);
                }
                // each element in the array should match the schema
                Array.prototype.forEach.call(config[key], (val, i) => {
                    checkConfig(val, configSchema[key][0], errPrefix + '[' + i + ']');
                });
            } else if(_lang.isObjectLike(configSchema[key])) {
                if(!_lang.isObjectLike(config[key])) {
                    throw new Error(errPrefix + `.${key} must be an object like`);
                }
                checkConfig(config[key], configSchema[key], errPrefix + '.' + key);
            } else {
                if(configSchema[key] !== config[key]) {
                    throw new Error(errPrefix + `.${key} must be equal to ${configSchema[key]}`);
                }
            }
        }
    }
    return true;
}

function checkConfig(config, configSchema, errPrefix = 'config') {
    if(_lang.isString(configSchema)) {
        let strVal = String(configSchema);
        switch(strVal) {
            case '<any>':
            break;
            case '<array>':
            if(!_lang.isArray(config)) {
                throw new Error(errPrefix + ` must be an array`);
            }
            break;
            case '<object>':
            if(!_lang.isObjectLike(config)) {
                throw new Error(errPrefix + ` must be an object like`);
            }
            break;
            case '<string>':
            if(!_lang.isString(config)) {
                throw new Error(errPrefix + ` must be a string`);
            }
            break;
            case '<boolean>':
            if(!_lang.isBoolean(config)) {
                throw new Error(errPrefix + ` must be a boolean`);
            }
            break;
            case '<number>':
            if(!_lang.isNumber(config)) {
                throw new Error(errPrefix + ` must be a number`);
            }
            break;
            default:
            if(config !== configSchema) {
                throw new Error(errPrefix + ` must be "${configSchema}"`);
            }
        }
    } else if (_lang.isArray(configSchema)) {
        if(!_lang.isArray(config)) {
            throw new Error(errPrefix + ` must be an array`);
        }
        // each element in the array should match the schema
        Array.prototype.forEach.call(config, (val, i) => {
            checkConfig(val, configSchema[0], errPrefix + '[' + i + ']');
        });
    } else if(_lang.isObjectLike(configSchema)) {
        if(!_lang.isObjectLike(config)) {
            throw new Error(errPrefix + ` must be an object like`);
        }
        for(let key of Object.keys(configSchema)) {
            if(key === '<any>') {
                // it means any value of key-value pair in config object should match the '<any>' object schema
                for(let val of Object.values(config)) {
                    checkConfig(val, configSchema['<any>'], errPrefix + '.<any>');
                }
            } else {
                if(!(key in config)) {
                    throw new Error(errPrefix + `.${key} does not exist`);
                }
                // check value
                checkConfig(config[key], configSchema[key], errPrefix + '.' + key);
            }
        }
    } else {
        if(configSchema !== config) {
            throw new Error(errPrefix + ` must be equal to ${configSchema}`);
        }
    }

    return true;
}

/**
 * wrap obj[keys] using wrapper function. **Only child function(no descendant) of obj will be wrapped**.
 * @param {object} obj 
 * @param {function} wrapper 
 */
function wrapModule(obj, wrapper) {
    for(let key of Object.keys(obj)) {
        if(typeof obj[key] === 'function') {
            obj[key] = wrapper(obj[key]);
        }
    }
}

export {
    DexieStoreSchema,
    serializableObjectCloneDeep,
    checkConfig,
    createConfigV1,
    wrapModule
};