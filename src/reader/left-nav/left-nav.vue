<template>
    <nav class="left-nav">
        <!-- 在模板里被调用的方法应该能直接看出其明确含义 -->
        <!-- 函数不要带状态，依赖外部状态的函数通过参数显式传入状态 -->
        <!-- 冗余状态通过计算属性提供 -->

        <!-- tiny mode -->
        <div
            class="tiny-size"
        >
            <!-- title bar -->
            <div class="title-bar-container">
                <sub-title-bar>
                    <template v-slot:right-action>
                        <button
                            type="button"
                            class="action-btn left-nav-common-btn"
                            title="展开"
                            @click="showFull"
                        >
                            <i class="fas fa-bars in-icon"></i>
                        </button>
                    </template>
                </sub-title-bar>
            </div>
            <!-- source list placeholder -->
            <div
                class="source-list-container"
            />
        </div>

        <!-- full mode -->
        <div
            class="full-size"
            :class="{'tiny-hidden': tiny.shouldFoldMain}"
        >
            <h1 class="window-title left-nav-pub-border">FeedPicker<sub>Reader</sub></h1>
            <!-- title-bar -->
            <div class="title-bar-container">
                <sub-title-bar
                    v-if="mode==='normal' || mode==='create-source'"
                    class="left-nav-pub-horizontal-pad title-bar-normal"
                >
                    <template v-slot:title-icon><i class="fas fa-rss"></i></template>
                    <template v-slot:title>源</template>
                    <!-- 点击窗口任意位置可收起列表 -->
                    <template v-slot:right-action>
                        <drop-down-list>
                            <template v-slot:header>
                                <button
                                    type="button"
                                    class="action-btn left-nav-common-btn"
                                    title="选项"
                                >
                                    <i class="fas fa-ellipsis-h in-icon" />
                                </button>
                            </template>
                            <template v-slot:drop-down-items>
                                <ul class="source-extend-ops">
                                    <li>
                                        <button
                                            type="button"
                                            @click="setMode('create-source')"
                                            class="action-btn left-nav-common-btn"
                                            title="添加"
                                        >
                                            <i class="fas fa-plus in-icon" />
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            type="button"
                                            @click="setMode('change-order')"
                                            class="action-btn left-nav-common-btn"
                                            title="排序"
                                        >
                                            <i class="fas fa-sort in-icon" />
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            type="button"
                                            @click="setMode('source-settings')"
                                            class="action-btn left-nav-common-btn"
                                            title="设置"
                                        >
                                            <i class="fas fa-pen in-icon" />
                                        </button>
                                    </li>
                                </ul>
                            </template>
                        </drop-down-list>
                    </template>
                </sub-title-bar>

                <sub-title-bar class="left-nav-pub-horizontal-pad title-bar-change-order" v-else-if="mode==='change-order'">
                    <!-- 改变顺序在拖动后放下时立即执行，而不等完成按钮被按下 -->
                    <template v-slot:title-icon><i class="fas fa-sort"></i></template>
                    <template v-slot:title>拖动以改变顺序</template>
                    <template v-slot:right-action>
                        <button type="button" @click="setMode('normal')" class="done-btn">完成</button>
                    </template>
                </sub-title-bar>

                <sub-title-bar class="left-nav-pub-horizontal-pad title-bar-source-settings" v-else-if="mode==='source-settings'">
                    <template v-slot:title-icon><i class="fas fa-pen"></i></template>
                    <template v-slot:title>选择源进行设置</template>
                    <!-- 在设置界面打开的情况下，其他页面对同一个源的设置更改不会在设置页面上响应 -->
                    <!-- 但是如果在其他页面删除了此源，则此页面会被关闭 -->
                    <template v-slot:right-action>
                        <button type="button" @click="finishSetting" class="done-btn">完成</button>
                    </template>
                </sub-title-bar>
            </div>

            <!-- source list -->
            <source-list
                class="source-list-container inbox-inset-shadow left-nav-pub-border"
                :mode="mode"
                :sources="sources"
                :settings-source-id="settingsSourceId"
                @clickcard="setSourceId(mode, $event)"
                @order-changed="setNewOrder"
            />

            <!-- footer -->
            <sub-title-bar
                class="foot-bar-container"
                v-show="mode==='normal' || mode==='create-source'"
            >
                <template v-slot:right-action>
                    <button type="button" @click="openOptions" class="action-btn left-nav-common-btn" title="全局设置">
                        <i class="fas fa-cog in-icon" />
                    </button>
                </template>
            </sub-title-bar>

            <!-- sliding window -->
            <slide-window
                class="slide-window-right"
                :left-nav-mode="mode"
                :selected-source="settingsSelectedSource"
                @close-slide-window="closeSlideWindow"
            />
        </div>
    </nav>
</template>

<script>
import browser from '../../utils/browser-polyfill';
import { addListener as addRuntimeListener, removeListener as removeRuntimeListener } from '../../utils/browser-runtime-events.js';
import { backendCall } from '../utils/background-call';
import { onOuterClick } from '../utils/event-enhance';

import subTitleBar from './components/sub-title-bar.vue';
import dropDownList from "../base-components/drop-down-list.vue";

import sourceList from './source-list.vue';
import slideWindow from './slide-window.vue';

const validModes = ['normal','change-order','source-settings', 'create-source'];
const validUpdateStatus = ['never', 'updating','success', 'warning', 'error'];

/**
 * If source is the only param passed, this function will reset the status to never
 */
function stateMixin(source, updateStatus = 'never', updateErrorMessage = '', updateWarningArticles = [], showWarning = false) {
    if(!validUpdateStatus.includes(updateStatus)) {
        console.warn('Get unexpected update status: ' + updateStatus);
        updateStatus = 'never';
    }
    source.updateStatus = updateStatus;
    source.updateErrorMessage = updateErrorMessage;
    source.updateWarningArticles = updateWarningArticles;
    source.showWarning = showWarning;
}

function transferSourceState(oldSources, newSources) {
    // update updateError
    //console.log(Object.keys(newSources));
    for(let sourceId of Object.keys(newSources)) {
        //console.log(newSources[sourceId]);
        if (oldSources.hasOwnProperty(sourceId)) {
            let oldSource = oldSources[sourceId];
            stateMixin(newSources[sourceId],
                oldSource.updateStatus,
                oldSource.updateErrorMessage,
                oldSource.updateWarningArticles,
                oldSource.showWarning
            );
        } else {
            stateMixin(newSources[sourceId]);
        }
    }
    return newSources;
}

export default {
    components: {
        subTitleBar,
        sourceList,
        slideWindow,
        dropDownList
    },
    inject: ['addGlobalMask'],
    provide() {
        return {
            componentRootVM: this
        };
    },
    data() {
        return {
            sources: {},
            /**
             * mode can be normal|change-order|source-settings
             */
            mode: 'normal',
            /**
             * can be ''|create|settings
             */
            slideWindowMode: '',
            // 使用前需要确认这个sourceId是否存在
            settingsSourceId: '',

            tiny: {
                shouldFoldMain: true
            }
        };
    },
    computed: {
        settingsSelectedSource() {
            // It is the inner-state source object "settingsSelectedSource"(only available on change source settings)
            if(this.settingsSourceId && this.sources.hasOwnProperty(this.settingsSourceId)) {
                return this.sources[this.settingsSourceId];
            } else {
                return undefined;
            }
        }
    },
    methods: {
        reloadSources(newSources) {
            if(!newSources) {
                // reload from scratch
                backendCall('getSources')
                    .then((newSources) => {
                        this.sources = transferSourceState(this.sources, newSources);
                        return backendCall('getAllLastUpdateResult');
                    })
                    .then(results => {
                        for(let result of results) {
                            switch(result.name) {
                                case 'source:renewSuccess':
                                this.renewSuccessHandler(result);
                                break;
                                case 'source:renewWarning':
                                this.renewWarningHandler(result);
                                break;
                                case 'source:renewError':
                                this.renewErrorHandler(result);
                                break;
                            }
                        }
                        return backendCall('getRenewingList');
                    })
                    .then(sourceIdList => {
                        for(let sourceId of sourceIdList) {
                            this.renewBeginHandler(sourceId);
                        }
                    });
            } else {
                // should always be async
                Promise.resolve().then(() => this.sources = transferSourceState(this.sources, newSources));
            }
        },
        renewSuccessHandler({ sourceId, lastUpdate }) {
            if(this.sources.hasOwnProperty(sourceId)) {
                stateMixin(this.sources[sourceId], 'success');
                this.sources[sourceId].lastUpdate = lastUpdate;
            }
        },
        renewWarningHandler({ sourceId, lastUpdate, failedArticles }) {
            if(this.sources.hasOwnProperty(sourceId)) {
                stateMixin(this.sources[sourceId], 'warning', '', failedArticles, this.sources[sourceId].showWarning);
                this.sources[sourceId].lastUpdate = lastUpdate;
            }
        },
        renewErrorHandler({ sourceId, errMsg }) {
            if(this.sources.hasOwnProperty(sourceId)) {
                stateMixin(this.sources[sourceId], 'error', errMsg, [], this.sources[sourceId].showWarning);
                console.warn('renewError: ' + errMsg);
            }
        },
        renewBeginHandler(sourceId) {
            if(this.sources.hasOwnProperty(sourceId)) {
                stateMixin(this.sources[sourceId], 'updating');
            }
        },
        setSourceId(mode, newSourceId) {
            switch(mode) {
                case 'normal':
                // case 'create-source':
                // 改变外部状态
                this.setGlobalSourceId(newSourceId);
                break;
                case 'source-settings':
                // 改变内部状态
                this.setSettingsSourceId(newSourceId);
                break;
                default:
                return;
            }
        },
        setGlobalSourceId(newSourceId) {
            // newSourceId possibly invalid the article
            this.$store.dispatch('setSourceIdAndValidate', newSourceId);
            // 如果是tiny mode那么收起left-nav
            this.removeClickListener();
            this.tiny.shouldFoldMain = true;
        },
        setSettingsSourceId(newSourceId) {
            this.settingsSourceId = newSourceId;
        },
        setMode(mode) {
            if(!validModes.includes(mode)) {
                this.mode = 'normal';
                console.warn('Get unexpected mode: ' + mode);
            } else {
                this.mode = mode;
            }
        },
        finishSetting() {
            this.setSettingsSourceId('');
            this.setMode('normal');
        },
        openOptions() {
            browser.tabs.create({
                active: true,
                url: 'options.html'
            });
        },
        closeSlideWindow(ev) {
            if(ev === 'create') {
                this.setMode('normal');
            } else if(ev === 'settings') {
                // set settingsSourceId to '' so the settings slide window will disappear
                this.setSettingsSourceId('');
            }
        },
        setNewOrder(res) {
            backendCall(
                'relocateSource',
                res
            );
        },
        showFull() {
            this.tiny.shouldFoldMain = false;

            this.removeClickListener();
            this.myClickListenerRemover = onOuterClick(this.$root, this, () => this.tiny.shouldFoldMain = true, true);
        },
        removeClickListener() {
            // intended for clear onOuterClick
            if(this.myClickListenerRemover) {
                this.myClickListenerRemover();
                this.myClickListenerRemover = undefined;
            }
        }
    },
    created() {
        // fetch data
        this.reloadSources();
        // register listeners
        
        this.myRuntimeListeners = [
            addRuntimeListener('sources:update', newSources => {
                //console.log(newSources);
                this.reloadSources(newSources);
            }),
            addRuntimeListener('source:delete', deletedSourceId => {
                // valid inner state
                if(this.sources.hasOwnProperty(deletedSourceId)) {
                    this.$delete(this.sources, deletedSourceId);
                }
                if(this.settingsSourceId === deletedSourceId) {
                    this.settingsSourceId = '';
                }
            }),
            addRuntimeListener('source:renewSuccess', this.renewSuccessHandler),
            addRuntimeListener('source:renewWarning', this.renewWarningHandler),
            addRuntimeListener('source:renewError', this.renewErrorHandler),
            addRuntimeListener('source:renewBegin', this.renewBeginHandler),
            addRuntimeListener('sources.settings.order:update', newSourceIdList => {
                for(let [i, sourceId] of newSourceIdList.entries()) {
                    if(this.sources.hasOwnProperty(sourceId)) {
                        this.sources[sourceId].settings.order = i;
                    }
                }
            })
        ];
    },
    beforeDestroy() {
        this.myRuntimeListeners.forEach(listener => removeRuntimeListener(...listener));
    },
};
</script>

<style lang="postcss">
@import '../article-list/colors.def.css';
@import './colors.def.css';
@import '../app/border-color.def.css';
@import '../app/width.def.css';

.left-nav {
    position: relative;

    overflow: visible;
    background-color: white;
}

.left-nav-pub-horizontal-pad {
    padding-left: 2.5rem;
    padding-right: 2rem;
}

.left-nav-pub-border {
    border-right: 1px solid $borderColor;
}

.window-title {
    font-size: 1.2rem;
    padding: .5em 1em .6em 0;
    text-align: center;
}

.title-bar-container {
    background-color: $subtitleThemeColor;
    color: white;
}

.source-extend-ops {
    height: 100%;
    width: 100%;
    & > li {
        /* remove white spaces */
        float: left;
        height: 100%;
        width: 100%;
    }
}

.source-list-container {
    position: relative;
    flex: 1;
    overflow-x: hidden;

    /* firefox only till 2019/4/2 */
    scrollbar-width: thin;
}

.tiny-size > .source-list-container {
    background-color: $subtitleThemeColor;
}

.source-list-no-source {
    text-align: center;
    font-size: .6rem;
    color: gray;
    padding: 1rem;
}

.foot-bar-container {
    background-color: $subtitleThemeColor;
    color: white;

    overflow: hidden;
}

.slide-window-right {
    position: absolute;
    top: 0;
    @media (min-width: $smallWidth) {
        left: 100%;
    }
    @media (max-width: $lessSmallWidth) {
        left: 0;
    }
    height: 100%;
    width: 15.5rem;
    overflow: hidden;
    box-shadow: 4px 0 4px rgba(0,0,0,.2);

    background-color: #f5f5f5;

    /* some of the elements of left-nav does not have a position, so they will be under relative/absolute positioned elements if z-index is not defined */
    z-index: 20;
}

.left-nav-common-btn {
    background-color: $commonBtnBgcolor;
    &:hover {
        background-color: $commonBtnBgcolorHover;
    }
    &:active {
        background-color: $commonBtnBgcolorHover;
    }
    & .in-icon {
        /* get rid of white spaces */
        width: 100%;
        float: left;
    }
}

.action-btn {
    display: block;

    height: 100%;
    width: 100%;
    
    overflow: hidden;
}

.done-btn {
    float: left;
    font-size: .8rem;
    color: $doneBtnTextcolor;
    font-weight: 300;
    &:hover {
        color: $doneBtnTextcolorHover;
    }

    &:active {
        color: $doneBtnTextcolorActive;
    }
}

.tiny-size, .full-size {
    height: 100%;

    display: flex;
    flex-direction: column;
}

@media (min-width: $fullWidth) {
    /* full */
    .left-nav {
        flex: 15rem 0 0;
        max-width: 15rem;
    }
    .tiny-size {
        display: none;
    }
    .full-size {
        width: 100%;
    }
}

@media (min-width: $mediumWidth) and (max-width: $lessFullWidth) {
    /* medium */
    .full-size.tiny-hidden {
        display: none;
    }
    .full-size {
        position: absolute;
        left: 0;
        top: 0;

        height: 100%;
        width: 15rem;

        background-color: inherit;
        box-shadow: 4px 0 4px rgba(0,0,0,.2);

        z-index: 20;
    }
}

@media (min-width: $smallWidth) and (max-width: $lessMediumWidth) {
    /* small */
    .left-nav {
        flex: 15rem 0 1;
        min-width: 15rem;
    }
    .tiny-size {
        display: none;
    }
    .full-size {
        width: 100%;
    }
}

@media (max-width: $lessSmallWidth) {
    /* min */
    .full-size.tiny-hidden {
        display: none;
    }
    .full-size {
        position: absolute;
        left: 0;
        top: 0;
        
        height: 100%;
        /* less than 320px */
        width: 15rem;

        background-color: inherit;
        box-shadow: 4px 0 4px rgba(0,0,0,.2);

        z-index: 20;
    }
}

</style>
