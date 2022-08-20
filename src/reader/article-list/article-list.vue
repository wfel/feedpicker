<template>
    <nav class="article-list-container">
        <div class="source-title-container">
            <div class="always-show article-list-common-padding">
                <h2 class="source-title">{{ sourceDispName }}</h2>
                <button
                    type="button"
                    class="source-article-opts"
                    @click="requestUpdateArticles"
                    title="立即抓取"
                    :disabled="renewDisabled"
                    :class="{'spin': renewing}"
                >
                    <i class="fas fa-sync" />
                </button>
                <button
                    type="button"
                    class="source-article-opts"
                    :class="{'filter-enabled': filterEnabled}"
                    @click="toggleFilterList"
                    title="过滤器"
                >
                    <i class="fas fa-filter" />
                </button>
            </div>
            <ul class="filter-list article-list-common-padding" v-show="shouldShowFilters">
                <li class="filter-list-item">
                    <input
                        id="filter-article-has-not-read"
                        type="checkbox"
                        value="has-not-read"
                        v-model="filterOpts.hasNotRead"
                    >
                    <label for="filter-article-has-not-read">&nbsp;未读</label>
                </li>
                <li class="filter-list-item">
                    时间范围：
                    <div>
                        <input type="checkbox" v-model="filterOpts.useFromDate">
                        <label>
                            从
                            <input type="date" v-model="filterOpts.fromDate" placeholder="YYYY-MM-DD">
                        </label>
                    </div>
                    <div>
                        <input type="checkbox"  v-model="filterOpts.useToDate">
                        <label>
                            至
                            <input type="date" v-model="filterOpts.toDate" placeholder="YYYY-MM-DD">
                        </label>
                    </div>
                </li>
            </ul>
        </div>
        <div class="article-card-list-container inbox-inset-shadow article-list-pub-border">
            <article-card-list
                :should-filter-date="shouldFilterDate"
                :filter-opts="filterOpts"
            />
        </div>
    </nav>
</template>

<script>
import { addListener as addRuntimeListener, removeListener as removeRuntimeListener } from '../../utils/browser-runtime-events.js';
import { backendCall } from '../utils/background-call';
import articleCardList from './article-card-list.vue';

const initSourceDispName = '选择一个源...';

export default {
    components: {
        articleCardList
    },
    data() {
        return {
            sourceDispName: initSourceDispName,
            renewDisabled: true,
            renewing: false,
            shouldShowFilters: false,
            filterOpts: {
                hasNotRead: false,
                useFromDate: false,
                fromDate: '', // it will be YYYY-MM-DD in string
                useToDate: false,
                toDate: ''
            }
        }
    },
    computed: {
        currGlobalSourceId() {
            return this.$store.state.currSourceId;
        },
        shouldFilterDate() {
            return Boolean((this.filterOpts.useFromDate && this.filterOpts.fromDate) || (this.filterOpts.useToDate && this.filterOpts.toDate));
        },
        filterEnabled() {
            return Boolean(this.filterOpts.hasNotRead || this.shouldFilterDate);
        }
    },
    created() {
        this.loadDispName(this.currGlobalSourceId);
        this.loadUpdatingStatus();
        
        this.myRuntimeListeners = [
            addRuntimeListener('sources:update', newSources => {
                //console.log(newSources);
                if(this.currGlobalSourceId && newSources.hasOwnProperty(this.currGlobalSourceId)) {
                    this.loadDispName('', newSources[this.currGlobalSourceId].settings.displayName);
                }
            }),
            addRuntimeListener('source:renewBegin', sourceId => {
                if(sourceId === this.currGlobalSourceId) {
                    this.renewDisabled = this.renewing = true;
                }
            }),
            addRuntimeListener('source:renewEnd', sourceId => {
                if(sourceId === this.currGlobalSourceId) {
                    this.renewDisabled = this.renewing = false;
                }
            })
        ];
    },
    beforeDestroy() {
        this.myRuntimeListeners.forEach(listener => removeRuntimeListener(...listener));
    },
    methods: {
        toggleFilterList() {
            this.shouldShowFilters = !this.shouldShowFilters;
        },
        requestUpdateArticles() {
            // console.log('fired');
            backendCall(
                'updateArticles',
                [this.currGlobalSourceId]
            );
        },
        loadDispName(sourceId, newDisplayName) {
            if(sourceId) {
                backendCall(
                    'getSources',
                    [sourceId]
                ).then(sources=> {
                    if(sources.hasOwnProperty(sourceId)) {
                        this.sourceDispName = sources[sourceId].settings.displayName;
                    }
                });
            } else if(newDisplayName) {
                this.sourceDispName = newDisplayName;
            } else {
                this.sourceDispName = initSourceDispName;
            }
        },
        loadUpdatingStatus() {
            if(!this.currGlobalSourceId) {
                this.renewDisabled = true;
                this.renewing = false;
            } else {
                backendCall('getRenewingList')
                    .then(sourceIdList => {
                        if(sourceIdList.includes(this.currGlobalSourceId)) {
                            this.renewDisabled = true;
                            this.renewing = true;
                        } else {
                            this.renewDisabled = false;
                            this.renewing = false;
                        }
                    });
            }
        }
    },
    watch: {
        currGlobalSourceId(val) {
            this.loadUpdatingStatus();
            if(val) {
                this.loadDispName(val);
            } else {
                this.loadDispName();
            }
        }
    }
}
</script>

<style lang="postcss" scoped>
@import '../base-components/text-overflow-blur.css';
@import './colors.def.css';
@import '../app/border-color.def.css';
@import '../app/width.def.css';

@import './components/padding.mixin.css';

.article-list-common-padding {
    @include common-horizontal-padding;
}

.article-list-pub-border {
    border-right: 1px solid $borderColor;
}

.article-list-container {
    display: flex;
    flex-direction: column;
    background-color: $bgcolorNormal;
    overflow: hidden;
}

.source-title-container {
    position: relative;

    font-size: .9rem;
    line-height: 2;
    background-color: $borderColor;

    & > .always-show {
        display: flex;
        align-items: center;
        min-height: 2rem;
    }
}

.source-title {
    position: relative;
    font-size: inherit;
    line-height: 1.2rem;
    padding: .15rem 0;
    flex: 1;
    overflow: hidden;
    overflow-wrap: break-word;
    max-height: 3rem;
    &::after {
        @include overflow-blur(1.35rem, $borderColor);
    }
}

.source-article-opts {
    position: relative;
    margin-left: .5em;
    font-size: inherit;

    color: #4d4d4d;

    &:hover:not([disabled]) {
        top: -1px;
        text-shadow: 0 1px 2px #0004;
    }

    &[disabled] {
        color: #555;
    }

    &.spin > i {
        animation-name: spin;
        animation-duration: 2s;
        animation-iteration-count: infinite;
        animation-timing-function: linear;
    }
}

.filter-enabled {
    color: #00b7ff;
    text-shadow: 0 0 4px #59d0ff, 0 0 1px white;
}

.filter-list {
    overflow: hidden;
    font-size: .8rem;
    background-color: #fbfbfb;
    padding-top: .4rem;
    padding-bottom: .6rem;
}


.filter-list-item {

}

.article-card-list-container {
    position: relative;
    flex: 1;
    overflow-x: hidden;

    /* firefox only till 2019/4/2 */
    scrollbar-width: thin;
}

@media (min-width: $fullWidth) {
    .article-list-container {
        flex: 20rem 0 0;
        max-width: 20rem;
    }
}

@media (min-width: $mediumWidth) and (max-width: $lessFullWidth) {
    .article-list-container {
        flex: 20rem 0 1;
        min-width: 16rem;
    }
}

@media (min-width: $smallWidth) and (max-width: $lessMediumWidth) {
    .article-list-container {
        flex: 20rem 1 1;
        min-width: 16rem;
    }
}

@media (max-width: $lessSmallWidth) {
    .article-list-container {
        flex: 1;
    }
}
</style>
