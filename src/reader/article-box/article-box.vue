<template>
    <section
        class="article-box"
        :class="{'hidden': tiny.shouldFoldMain}"
    >
        <div class="article-box-article-info" v-if="hasArticleLoaded">
            <div class="info-upper">
                <h2 class="title">
                    {{ currVer.title }}
                    <a
                        :href="currVer.link"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fas fa-external-link-alt"
                        title="打开原文"
                    />
                </h2>
                <div class="dates">
                    <time :datetime="currVer.date.toISOString()" class="base-time">发布日期: {{ currVerReadableDate }}</time>
                    <time :datetime="article.firstSeen.toISOString()" class="base-time">抓取日期: {{ currVerFirstSeenReadableDate }}</time>
                </div>
            </div>
            <div class="info-lower">
                <version-indicator
                    :article="article"
                    :curr-ver-index="currGlobalArticleVer"
                    @clickver="setVersion($event)"
                />
            </div>
        </div>
        <article class="article-box-article-content" v-show="hasArticleLoaded">
            <iframe frameborder="0" sandbox="allow-scripts allow-top-navigation-by-user-activation" ref="contentiframe" v-show="currVer.content" class="content-iframe" height="100%" width="100%"></iframe>
            <p v-show="!currVer.content" class="nothing-here">本文没有内容</p>
        </article>
    </section>
</template>

<script>
import { getReadableTimeString } from '../utils/time-transform.js';

import { addListener as addRuntimeListener, removeListener as removeRuntimeListener } from '../../utils/browser-runtime-events.js';
import { backendCall } from '../utils/background-call';
import { onOuterClick } from '../utils/event-enhance';

import versionIndicator from '../base-components/version-indicator.vue';

// hash script using https://approsto.com/sha-generator/
// sha256-NYtsRhGZ/sVQeX7xdzTMe/HM7vUt8jQ5THPK8JLPnYA=
// remember to update hash if script changed
// TODO: auto hashing
import iframeHTML from './content-box.html';

function setContent(childWindow, innerHTML, sender) {
    //console.log(innerHTML);
    const maxRetry = 20;
    var done = false;
    var token = Math.random();
    var counter = 0;
    var cb = function(ev) {
        if(ev.data.name === 'contentSet' && ev.data.token === token) {
            window.removeEventListener('message', cb);
            done = true;
        }
    };

    var message = {
        name: 'setContent',
        innerHTML,
        token,
        sender
    };

    window.addEventListener('message', cb);
    childWindow.postMessage(message, '*');
    var interval = setInterval(() => {
        if(++counter > maxRetry) {
            console.error('iframe no respond');
            clearInterval(interval);
        } else if(done) {
            clearInterval(interval);
        } else {
            childWindow.postMessage(message, '*');
        }
    }, 1000);
}

export default {
    components: {
        versionIndicator
    },
    data() {
        return {
            hasArticleLoaded: false,
            article: {},
            tiny: {
                shouldFoldMain: true
            }
        }
    },
    computed: {
        currGlobalArticleId() {
            return this.$store.getters.currArticleId;
        },
        currGlobalArticleVer() {
            return this.$store.state.currArticleVer;
        },
        currGlobalPageWidth() {
            return this.$store.state.pageWidth;
        },
        currVer() {
            if(!this.hasArticleLoaded) return {};
            return this.article.versions[this.currGlobalArticleVer];
        },
        currVerReadableDate() {
            if(!this.hasArticleLoaded) return '';
            return getReadableTimeString(this.$store.state.now, this.currVer.date);
        },
        currVerFirstSeenReadableDate() {
            if(!this.hasArticleLoaded) return '';
            return getReadableTimeString(this.$store.state.now, this.currVer.firstSeen);
        }
    },
    methods: {
        loadArticle() {
            //console.log('reload article');
            if(this.$store.state.currArticlePrimaryKey < 0) return;
            backendCall(
                'getArticle',
                this.$store.state.currArticlePrimaryKey
            ).then(article => {
                if(article) {
                    this.article = article;
                    this.setArticleLoadStatus(true);
                    // set article to read once it is loaded
                    this.setCurrVerToRead();
                }
            });
        },
        setVersion(i) {
            this.$store.commit('setArticleVer', i);
        },
        setCurrVerToRead() {
            backendCall(
                'updateReadStatus',
                this.article.id,
                [this.currGlobalArticleVer]
            );
        },
        invalidateArticle() {
            this.$store.dispatch('invalidateArticle');
            this.$store.commit('setValidity', false);
        },
        removeMyClickEvent() {
            if(this.myClickListenerRemover) {
                this.myClickListenerRemover();
                this.myClickListenerRemover = undefined;
            }
        },
        setArticleLoadStatus(status) {
            this.hasArticleLoaded = status;
            this.tiny.shouldFoldMain = !status;
            // 总是安全且是必要的
            this.removeMyClickEvent();
            if(status) {
                setTimeout(() => {
                    this.myClickListenerRemover = onOuterClick(this.$root, this, () => {
                        if(this.currGlobalPageWidth === 'small' || this.currGlobalPageWidth === 'min') {
                            this.tiny.shouldFoldMain = true;
                            this.invalidateArticle();
                            this.removeMyClickEvent();
                        }
                    }, false);
                }, 0);
            }
        }
    },
    watch: {
        currVer() {
            if(this.hasArticleLoaded && this.$refs.contentiframe.contentWindow) {
                // all of the operations will affect this
                setContent(this.$refs.contentiframe.contentWindow, this.currVer.content, 'currVerWatcher');
            }
        },
        currGlobalArticleId() {
            this.setArticleLoadStatus(false);
            if(this.$store.state.isArticleValid) {
                this.loadArticle();
            }
        },
        currGlobalArticleVer() {
            if(this.$store.state.isArticleValid && this.$store.state.currArticlePrimaryKey === this.article.id) {
                this.setCurrVerToRead();
            }
        }
    },
    created() {
        this.myRuntimeListeners = [
            addRuntimeListener('articles:update', ({sourceId, result: {updated}}) => {
                if(sourceId !== this.article.sourceId) return;
                for(let updatedArticle of updated) {
                    if(this.article.id === updatedArticle.id) {
                        this.article = updatedArticle;
                        break;
                    }
                }
            }),
            addRuntimeListener('articles.read:update', ({primaryKey, versionIndices, newStatus}) => {
                if(this.article.id !== primaryKey) return;
                for(let vi of versionIndices) {
                    if(vi < this.article.versions.length) {
                        this.article.versions[vi].hasRead = newStatus;
                    }
                }
                this.article.read = this.article.versions.every(ver => ver.hasRead)? 1 : 0;
            })
        ];
    },
    mounted(){
        this.$refs.contentiframe.srcdoc = iframeHTML;
        this.loadArticle();
        // pass click events
        window.addEventListener('message', ev => {
            if(ev.data.name !== 'click') return;
            this.$el.click();
        });
    },
    beforeDestroy() {
        if(this.myClickListenerRemover) {
            this.myClickListenerRemover();
            this.myClickListenerRemover = undefined;
        }
        this.myRuntimeListeners.forEach(listener => removeRuntimeListener(...listener));
    }
}
</script>

<style lang="postcss" scoped>
@import '../app/border-color.def.css';
@import '../app/width.def.css';

.article-box {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: white;
}

.article-box-article-info {
    border-bottom: 1px solid #bcbcbc;
    padding: 1rem;
}

.info-upper {
    display: flex;
    line-height: 1.5;
    & > .title {
        flex: 1;
        font-size: 1.2rem;
        padding-right: .5rem;
        overflow: hidden;
        overflow-wrap: break-word;
        & > a {
            color: black;
            font-size: .8rem;
            vertical-align: middle;
            text-decoration: none;
        }
    }

    & > .dates {
        align-self: center;
        font-size: .8rem;
        padding-left: .5rem;
        & > time {
            display: block;
        }
    }
}

.info-lower {
    margin-top: .5rem;
}

.article-box-article-content {
    flex: 1;
}

.content-iframe {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
}

.nothing-here {
    text-align: center;
    margin-top: 1rem;
}

@media (min-width: $mediumWidth) {
    .article-box {
        flex: 1;
        min-width: 24rem;

    }
}

@media (min-width: $smallWidth) and (max-width: $lessMediumWidth) {
    .article-box {
        position: absolute;
        top: 0;
        right: 0;
        transform: translateX(0);
        border-left: 1px solid $borderColor;
        box-shadow: -4px 0 4px rgba(0,0,0,.2);


        width: 30rem;
        z-index: 20;
    }

    .article-box.hidden {
        transform: translateX(100%);
    }
}

@media (max-width: $lessSmallWidth) {
    .article-box {
        position: absolute;
        top: 0;
        right: 0;
        transform: translateX(0);
        border-left: 1px solid $borderColor;
        box-shadow: -4px 0 4px rgba(0,0,0,.2);


        width: calc(100% - 1rem);
        z-index: 20;
    }

    .article-box.hidden {
        transform: translateX(100%);
    }
}

</style>
