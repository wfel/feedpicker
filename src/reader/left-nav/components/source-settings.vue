<template>
    <ul class="source-settings-container">
        <li class="field">
            <label>
                <h3>名称</h3>
                <input type="text" v-model="copiedSource.settings.displayName" class="text-input-field">
            </label>
        </li>
        <li class="field">
            <label>
                <h3>源描述(JSON)</h3>
                <textarea
                    name="source-descrpition"
                    v-model="copiedSource.sourceDescriptionJSON"
                    class="text-input-field"
                />
                <span
                    v-show="sourceDescriptionError"
                    class="source-desc-error-box"
                >{{ sourceDescriptionError }}</span>
            </label>
        </li>
        <li class="field">
            <label class="update-paused">
                <h3>暂停自动抓取</h3>
                <input type="checkbox" v-model="copiedSource.settings.updatePaused">
            </label>
        </li>
    </ul>
</template>

<script>
import * as _cloneDeep from 'lodash/cloneDeep';

import { checkSourceDescription } from '../../../crawler-core/help-functions';

function checkSourceDescriptionJSON(newSourceDescJSON) {
    var newSourceDescription;

    newSourceDescription = JSON.parse(newSourceDescJSON);

    checkSourceDescription(newSourceDescription);

    return true;
}

function copySource(newSource) {
    return {
        sourceDescriptionJSON: newSource.sourceDescription?JSON.stringify(newSource.sourceDescription, null, 2):'',
        settings: _cloneDeep(newSource.settings)
    }
}

export default {
    props: {
        source: {
            type: Object,
            default() {
                return {
                    // 传进来的sourceDescription应该是object
                    sourceDescription: null,
                    settings: {
                        displayName: '',
                        updatePaused: false
                    }
                };
            }
        }
    },
    data() {
        return {
            copiedSource: copySource(this.source),
            sourceDescriptionError: ''
        }
    },
    methods: {
        getInnerSource() {
            // throw an error if check failed
            checkSourceDescriptionJSON(this.copiedSource.sourceDescriptionJSON);
            return {
                sourceDescription: JSON.parse(this.copiedSource.sourceDescriptionJSON),
                settings: _cloneDeep(this.copiedSource.settings)
            };
        },
        reset() {
            this.copiedSource = copySource(this.source);
            this.sourceDescriptionError = '';
        }
    },
    watch: {
        'copiedSource.sourceDescriptionJSON': function(val, oldVal) {
            try {
                checkSourceDescriptionJSON(val);
            } catch(e) {
                this.sourceDescriptionError = e.message;
                return false;
            }
            this.sourceDescriptionError = '';
        },
        'source': {
            handler: function(val, oldVal) {
                this.copiedSource = copySource(val);
            },
            deep: true
        }
    }
};
</script>

<style lang="postcss" scoped>
.source-settings-container {
    line-height: 1.5;
    font-size: .8rem;
}

.field {
    margin-bottom: 1rem;
}

.field h3 {
    font-size: .9rem;
    font-weight: normal;
}

.source-desc-error-box {
    color:red;
}

.text-input-field {
    width: 100%;
    resize: none;
}

textarea.text-input-field {
    height: 25em;
}

.update-paused {
    display: flex;
    & > h3 {
        flex: 1;
    }
}
</style>
