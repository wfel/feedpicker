<template>
    <div v-show="shouldShowSlideWindow">
        <slide-right class="create-source-form" v-show="shouldShowCreate" @clickclose="closeCreate">
            <template v-slot:title>新建源</template>
            <template>
                <source-settings ref="createSourceForm" />
                <button type="button" @click="createSource" class="full-line-btn apply-btn">添加</button>
            </template>
        </slide-right>

        <slide-right class="source-settings-form" v-show="shouldShowSettings" @clickclose="closeFor('settings')">
            <template v-slot:title>源设置</template>
            <template>
                <source-settings :source="selectedSource" ref="sourceSettingsForm" />
                <button type="button" @click="deleteSource" class="full-line-btn delete-btn">删除源</button>
                <button type="button" @click="changeSourceSettings" class="full-line-btn apply-btn">应用</button>
            </template>
        </slide-right>
    </div>
</template>

<script>
import slideRight from './components/slide-right.vue';
import sourceSettings from './components/source-settings.vue';

import { backendCall } from '../utils/background-call';
import { onOuterClick } from '../utils/event-enhance';

export default {
    components: {
        slideRight,
        sourceSettings
    },
    props: {
        leftNavMode: String,
        selectedSource: Object,
    },
    computed: {
        shouldShowSettings() {
            return (this.leftNavMode === 'source-settings' && this.selectedSource)? true : false;
        },
        shouldShowCreate() {
            return this.leftNavMode==='create-source';
        },
        shouldShowSlideWindow() {
            if(this.leftNavMode === 'create-source') {
                return true;
            } else if(this.leftNavMode === 'source-settings' && this.shouldShowSettings) {
                return true;
            } else {
                return false;
            }
        }
    },
    methods: {
        createSource() {
            var innerSource;
            try {
                innerSource = this.$refs.createSourceForm.getInnerSource();
            } catch (e) {
                alert(e.message);
                return false;
            }
            this.removeMyListener();
            backendCall(
                'createSource',
                innerSource.sourceDescription,
                innerSource.settings.displayName,
                innerSource.settings.updatePaused
            ).then(newSource => {
                this.$refs.createSourceForm.reset();
                // 立即抓取一次
                if(!newSource.settings.updatePaused) {
                    return backendCall(
                        'updateArticles',
                        [newSource.storageKey]
                    )
                }
            })
            .catch(e => {
                console.error(e);
                return Promise.reject(e);
            });
            // 这里也需要加一个全屏mask
            this.$emit('close-slide-window', 'create');
        },
        deleteSource() {
            if(!this.selectedSource) {
                alert('不能删除一个不存在的源！');
                this.$emit('close-slide-window', 'settings');
                return false;
            }
            var res = prompt(`你确定要删除"${this.selectedSource.settings.displayName}"吗? 请在文本框中输入此源的名称，然后点击确认来删除此源。`)
            if(res === null) {
                return false;
            } else if(res !== this.selectedSource.settings.displayName) {
                alert('执行失败：输入的名称与要删除的源的名称不匹配');
                return false;
            } else {
                let dispName = this.selectedSource.settings.displayName;
                backendCall(
                    'deleteSource',
                    this.selectedSource.storageKey
                ).then(() => {
                    alert('已删除' + dispName);
                });
                this.$emit('close-slide-window', 'settings');
            }
        },
        changeSourceSettings() {
            var innerSource;
            try {
                innerSource = this.$refs.sourceSettingsForm.getInnerSource();
            } catch (e) {
                alert(e.message);
                return false;
            }
            var prom;
            if(JSON.stringify(this.selectedSource.sourceDescription) == JSON.stringify(innerSource.sourceDescription)) {
                prom = backendCall(
                    'updateSource',
                    this.selectedSource.storageKey,
                    innerSource.settings
                );
            } else {
                prom = backendCall(
                    'updateSource',
                    this.selectedSource.storageKey,
                    innerSource.settings,
                    innerSource.sourceDescription
                );
            }

            // 这段时间里可能给整个窗口加个mask防止用户乱操作会比较好
            prom.then(newSources => {
                alert('已应用');
            });

        },
        closeCreate() {
            this.closeFor('create');
            this.removeMyListener();
        },
        closeFor(str) {
            this.$emit('close-slide-window', str);
        },
        removeMyListener() {
            // 在一切离开create页面时调用
            if(this.myClickListenerRemover) {
                this.myClickListenerRemover();
                this.myClickListenerRemover = undefined;
            }
        }
    },
    watch: {
        shouldShowCreate(val) {
            if(val) {
                this.removeMyListener();
                setTimeout(() => {
                    // 防止用于打开create-source的click事件把create-source关闭
                    this.myClickListenerRemover = onOuterClick(
                        this.$root,
                        this,
                        () => { this.$emit('close-slide-window', 'create') },
                        true);
                }, 0);
            }
        }
    },
    beforeDestroy() {
        this.removeMyListener();
    }
}
</script>

<style lang="postcss">
.full-line-btn {
    display: block;
    font-size: 1rem;
    line-height: 2;

    width: 100%;

    border: 2px solid gray;

    margin: 1rem 0;

    &:hover {
        background-color: rgba(0,0,0,.1);
    }

    &:active {
        background-color: rgba(0,0,0,.3);
    }
}

.delete-btn {
    color: red;
    border-color: red;
}

.apply-btn {
    margin-top: 2.5rem;
}
</style>
