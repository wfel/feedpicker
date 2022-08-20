<template>
    <ol class="article-card-list">
        <article-card
            v-for="article in articleArr"
            :key="article.sourceId + article.key"
            :article="article"
            :now="$store.state.now"
            @open-article="openArticle"
            @set-curr-ver="article.currentVersionIndex = $event"
            :selected="$store.state.currArticlePrimaryKey === article.id"
            class="common-padding"
        />
        <li class="article-card-final">
            <button
                type="button"
                v-show="hasMore"
                @click="showMore"
                title="加载更多"
                class="load-more-btn"
            >
                更多
            </button>
            <span v-show="!hasMore" class="no-more">没有更多了</span>
        </li>
    </ol>
</template>

<script>
import { addListener as addRuntimeListener, removeListener as removeRuntimeListener } from '../../utils/browser-runtime-events.js';
import { backendCall } from '../utils/background-call';
import articleCard from './components/article-card.vue';
import { binarySearch } from '../../utils/algo.js';

const articleComp = (ar1, ar2) => ar1.id - ar2.id;

function transferArticleState(oldArticle, newArticle) {
    if(oldArticle) {
        newArticle.currentVersionIndex = oldArticle.currentVersionIndex;
    } else {
        // 从0开始计数，但是显示的是index + 1
        newArticle.currentVersionIndex = 0;
    }
}

export default {
    components: {
        articleCard
    },
    props: {
        shouldFilterDate: Boolean,
        filterOpts: Object
    },
    data() {
        return {
            articleArr: [],
            hasMore: false,
            currFilterOpts: {},
        }
    },
    computed: {
        currGlobalSourceId() {
            return this.$store.state.currSourceId;
        },
        currGlobalArticleVer() {
            return this.$store.state.currArticleVer;
        }
    },
    methods: {
        /**
         * @param {boolean=true} replace true for replace the articleArr, false for concatenate onto the articleArr
         */
        loadArticleList(replace=true, offset=0, step=15) {
            // load期间用户改变了sourceId? 应该不用管，回调应该顺序执行（的吧？）
            var prom;
            var dateFrom = (this.filterOpts.useFromDate && this.filterOpts.fromDate) ? new Date(this.filterOpts.fromDate + ' 00:00:00'): null,
                dateTo = (this.filterOpts.useToDate && this.filterOpts.toDate) ? new Date(this.filterOpts.toDate + ' 23:59:59'): null;
            var remainingParams = {
                offset,
                step
            };
            if(dateFrom) {
                remainingParams.dateFrom = dateFrom;
            }
            if(dateTo) {
                remainingParams.dateTo = dateTo;
            }
            //console.log('filtering with');
            //console.log(remainingParams);
            if(!this.filterOpts.hasNotRead && !this.shouldFilterDate) {
                //console.log('A');
                prom = backendCall(
                    'getLatestArticles',
                    this.currGlobalSourceId,
                    offset,
                    step
                );
            } else if (this.filterOpts.hasNotRead && !this.shouldFilterDate) {
                //console.log('B');
                prom = backendCall(
                    'getLatestUnreadArticles',
                    this.currGlobalSourceId,
                    offset,
                    step
                );
            } else {
                if(dateFrom && dateTo && dateFrom > dateTo) return;
                prom = backendCall(
                    'multiFilter',
                    this.currGlobalSourceId,
                    this.filterOpts.hasNotRead,
                    remainingParams
                );
            }

            prom.then(articles => {
                if(articles.length === step) {
                    this.hasMore = true;
                } else {
                    this.hasMore = false;
                }
                articles.forEach(article => transferArticleState(null, article));
                if(replace) {
                    this.articleArr = articles;
                } else {
                    this.articleArr = this.articleArr.concat(articles);
                }

                this.rebindArticleVer();
            });
        },
        clearArticleList() {
            this.hasMore = false;
            this.articleArr = [];
        },
        showMore() {
            this.loadArticleList(false, this.articleArr.length);
        },
        rebindArticleVer() {
            if(!this.$store.state.isArticleValid) return;
            var id = this.$store.state.currArticlePrimaryKey;
            var index = binarySearch(this.articleArr, {id}, articleComp);
            if(index > -1)
                this.articleArr[index].currentVersionIndex = this.currGlobalArticleVer;
        },
        openArticle({sourceId, key, primaryKey, verIndex}) {
            this.$store.dispatch('setArticle', {
                newSourceId: sourceId,
                newArticleKey: key,
                newPrimaryKey: primaryKey,
                newVersionIndex: verIndex
            });
        }
    },
    watch: {
        filterOpts: {
            handler(val) {
                if(!this.currGlobalSourceId) return;
                // replace
                this.loadArticleList();
            },
            deep: true
        },
        currGlobalArticleVer(val, oldVal) {
            this.rebindArticleVer();
        },
        currGlobalSourceId(val) {
            if(val) {
                // replace
                this.loadArticleList();
            } else {
                this.clearArticleList();
            }
        }
    },
    created() {
        this.loadArticleList();
        
        this.myRuntimeListeners = [
            addRuntimeListener('articles:update', ({sourceId, result: {inserted, updated}}) => {
                if(!(sourceId === this.currGlobalSourceId)) return;
                if(this.filterEnabled) {
                    // replace
                    this.loadArticleList();
                } else {
                    // mode must be 'getLatest'
                    // 替换更新的文章
                    let currArticleArr = this.articleArr;
                    for(let updatedArticle of updated) {
                        let resultIndex = binarySearch(currArticleArr, updatedArticle, articleComp);
                        if(resultIndex > -1) {
                            transferArticleState(currArticleArr[resultIndex], updatedArticle)
                            this.articleArr.splice(resultIndex, 1, updatedArticle);
                        }
                    }
                    // 插入新的文章
                    inserted.forEach(article => transferArticleState(null, article));
                    this.articleArr.splice(0,0, ...inserted);
                }
            }),
            addRuntimeListener('articles.read:update', ({primaryKey, versionIndices, newStatus}) => {
                let currArticleArr = this.articleArr;
                let resultIndex = binarySearch(currArticleArr, {id: primaryKey}, articleComp);
                if(resultIndex > -1) {
                    let article = currArticleArr[resultIndex];
                    for(let vi of versionIndices) {
                        if(vi < article.versions.length) {
                            article.versions[vi].hasRead = newStatus;
                        }
                    }
                    article.read = article.versions.every(ver => ver.hasRead)? 1 : 0;
                }
            })
        ];
    },
    beforeDestroy() {
        this.myRuntimeListeners.forEach(listener => removeRuntimeListener(...listener));
    }
}
</script>

<style lang="postcss">
@import './components/padding.mixin.css';

.common-padding {
    @include common-horizontal-padding;
}

.article-card-list {
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: thin;
}

.article-card-final {
    text-align: center;
    border-top: 1px solid #9f9f9f;
    line-height: 2.5;
}

.load-more-btn {
    display: block;
    width: 100%;
    font-size: .9rem;

    &:hover {
        background-color: #0002;
    }

    &:active {
        background-color: #0005;
    }
}

.no-more {
    color: gray;
    font-size: .8rem;
}
</style>

