<template>
    <div class="global-container">
        <div class="upper-container common-horizontal-padding">
            <button
                type="button"
                class="open-reader-btn"
                @click="openReader"
            >
                打开Reader
            </button>
        </div>
        <div class="update-status-container">
            <h1 class="title">上次全局更新：<span v-show="!hasRec">暂无更新记录</span></h1>
            <ul v-if="loaded" class="article-list-container">
                <mini-article-list
                    v-for="result in resultArr"
                    :key="result.sourceId"
                    :result="result"
                    :source="sources[result.sourceId]"
                    class="article-list"
                />
            </ul>
        </div>
    </div>
</template>

<script>
import browser from '../utils/browser-polyfill';
import { backendCall } from '../reader/utils/background-call';
import miniArticleList from './mini-article-list.vue';

export default {
    components: {
        miniArticleList
    },
    data() {
        return {
            loaded: false,
            sources: {},
            resultArr: []
        }
    },
    computed: {
        hasRec() {
            return this.resultArr.length > 0;
        }
    },
    methods: {
        openReader() {
            browser.tabs.create({
                active: true,
                url: 'reader.html'
            });
        }
    },
    async created() {
        var resultArr = await backendCall('getFromSharedStore', 'lastGlobalUpdateResult');
        if(!resultArr) return;
        let sourceIdList = resultArr.map(result => result.sourceId);
        this.resultArr = resultArr;
        var sources = await backendCall('getSources', sourceIdList);
        this.sources = sources;
        this.loaded = true;
    }
}
</script>

<style lang="postcss">
@import '../reader/base-components/button-reset.css';
@import './height-def.css';

* {
    box-sizing: border-box;
}

html {
    font-size: 1.25em;
    scrollbar-width: thin;
}

body {
    margin: 0;
    padding: 0;
    width: 16rem;
    /* height of popup is a firefox bug fixed in firefox 50 */
    /* https://bugzilla.mozilla.org/show_bug.cgi?id=1215025 */
    overflow-x: hidden;
    overflow-y: auto;
}

h1, h2, h3, p {
    margin: 0;
    padding: 0;
}

ul, ol {
    padding: 0;
    margin: 0;
}

li {
    display: block;
}

.common-horizontal-padding {
    padding-left: .8rem;
    padding-right: .8rem;
}

.global-container {
    padding: 0 1rem;
}

.upper-container {
    position: sticky;
    /* for full-width container */
    box-sizing: content-box;
    top: 0;
    width: 100%;
    height: $buttonHeight;

    padding-top: .3rem;
    padding-bottom: .3rem;

    margin-left: -.8rem;
    margin-right: -.8rem;

    background-color: white;
    z-index: 1;
}

.open-reader-btn {
    display: block;
    width: 100%;

    font-size: .8rem;
    line-height: 1.75;

    border: 1px solid #555;

    &:hover {
        /* see reader/left-nav/slide-window.vue for this def */
        background-color: rgba(0,0,0,.1);
    }

    &:active {
        background-color: rgba(0,0,0,.3);
    }
}

.update-status-container {
    position: relative;
    width: 100%;
}

.title {
    font-size: .7rem;
    font-weight: normal;
    margin-bottom: .4rem;
}

.article-list-container {
    width: 100%;
}
</style>


