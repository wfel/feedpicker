import {
    DexieStoreSchema
} from './help-function';

const idbSchemaV1 = {
    articles: new DexieStoreSchema({
        key: {
            path: 'id',     // yes it has a primary-key "id", but it should be left unmodified
            autoIncrement: true
        },
        indices: {
            articleId: {
                path: ['sourceId', 'key'],
                params: {
                    unique: true
                }
            },
            sourceId: {
                path: 'sourceId'
            },
            read: {
                path: ['sourceId', 'read']
            },
            articleDate: {
                path: 'articleDate',
                params: {
                    multiEntry: true
                }
            }
        }
    }),
    lastUpdateResult: new DexieStoreSchema({
        key: {
            path: 'sourceId'
        }
    }),
    sharedStore: new DexieStoreSchema({
        key: {
            path: ''    // use out-of-line key
        }
    })
};

const configSchemaV1 = {
    configVersion: 1,
    idbVersion: '<number>',
    sources: {
        '<any>': {
            sourceDescription: '<object>',
            lastUpdate: '<string>',
            storageKey: '<string>',
            settings: {
                order: '<number>',
                displayName: '<string>',
                updatePaused: '<boolean>'
            }
        }
    },
    globalSettings: '<object>',
    shared: '<any>'
};

export {
    idbSchemaV1,
    configSchemaV1
}