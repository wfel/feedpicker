const {
    DexieStoreSchema,
    checkConfig,
    createConfigV1
} = require('./help-function');
const {
    configSchemaV1
} = require('./storage-schema');

test('DexieSchema constructor 1', () => {
    const waitForChecking = new DexieStoreSchema({
        key: {
            path: ['sourceId', 'key']
        },
        indices: {
            freshness: {
                path: ['sourceId', 'firstSeen', 'originalWeight'],
                params: {
                    multiEntry: true
                }
            }
        }
    });
    expect(waitForChecking).toHaveProperty('key', {
        path: ['sourceId', 'key'],
        dexiePath: '[sourceId+key]'
    });
    expect(waitForChecking).toHaveProperty('indices', {
        freshness: {
            path: ['sourceId', 'firstSeen', 'originalWeight'],
            params: {
                multiEntry: true
            },
            dexiePath: '[sourceId+firstSeen+originalWeight]'
        }
    });
    expect(waitForChecking).toHaveProperty('schema', '[sourceId+key],*[sourceId+firstSeen+originalWeight]');
});

test('DexieSchema constructor 2', () => {
    const waitForChecking = new DexieStoreSchema({
        indices: {
            read: {
                path: 'read',
                params: {
                    unique: true
                }
            }
        }
    });
    expect(waitForChecking).toHaveProperty('schema', ',&read');
    expect(waitForChecking).toHaveProperty('indices', {
        read: {
            path: 'read',
            params: {
                unique: true
            },
            dexiePath: 'read'
        }
    })
});

test('test checkConfig', () => {
    expect(checkConfig(createConfigV1(), configSchemaV1)).toBe(true);

    expect(() => checkConfig({
        idbVersion: '<number>'
    }, {
        idbVersion: '<number>'
    })).toThrow('config.idbVersion must be a number');

    expect(() => checkConfig({
        obj: null
    }, {
        obj: {
            key: '<any>'
        }
    })).toThrow('config.obj must be an object like');

    expect(() => checkConfig({
        obj: {
            foo: 'bar'
        }
    }, {
        obj: {
            key: '<any>'
        }
    })).toThrow('config.obj.key does not exist');

    expect(checkConfig({
        obj: {
            key: { foo: 'bar' }
        }
    }, {
        obj: {
            '<any>': { foo: '<any>' }
        }
    })).toBe(true);

    expect(checkConfig({
        arr: [{
            key: { foo: 'bar' }
        }]
    }, {
        arr: [{
            '<any>': { foo: '<any>' }
        }]
    })).toBe(true);

    expect(checkConfig({
        arr: [{
            key: { foo: 'bar' }
        }]
    }, '<object>')).toBe(true);
});