<template>
    <li class="mini-article-list">
        <div
            class="title-container common-horizontal-padding"
            :class="{'show-content': shouldShowContent}"
            @click="shouldShowContent = !shouldShowContent"
        >
            <i class="fas fa-caret-left arrow" />
            <h2
                class="source-title"
            >
                <i
                    v-if="isError"
                    title="抓取失败"
                    class="fas fa-exclamation-triangle status-icon icon-error"
                />
                <i
                    v-else-if="isWarning"
                    title="部分成功"
                    class="fas fa-exclamation-circle status-icon icon-warning"
                />
                <i
                    v-else-if="isSuccess"
                    title="更新成功"
                    class="fas fa-check-circle status-icon icon-success"
                />
                {{ source.settings.displayName }}
            </h2>
        </div>
        
        <div class="common-horizontal-padding" v-show="shouldShowContent">
            <div v-if="hasInserted" class="sub-list">
                <h3>新文章</h3>
                <ol class="content">    
                    <li
                        v-for="article in result.result.dbResult.inserted"
                        :key="article.sourceId + article.key"
                    >
                        <a
                            :href="constructHref(article.sourceId, article.key, 0)"
                            target="_blank"
                            @click.prevent="openLink(constructHref(article.sourceId, article.key, 0))"
                        >{{ article.versions[0].title }}</a>
                    </li>
                </ol>
            </div>
            <div v-if="hasUpdated" class="sub-list">
                <h3>有更新的文章</h3>
                <ol class="content">
                    <li
                        v-for="article in result.result.dbResult.updated"
                        :key="article.sourceId + article.key"
                    >
                        <a
                            :href="constructHref(article.sourceId, article.key, 0)"
                            target="_blank"
                            @click.prevent="openLink(constructHref(article.sourceId, article.key, 0))"
                        >{{ article.versions[0].title }}</a>
                    </li>
                </ol>
            </div>
            <div v-if="hasPartiallyFailed" class="sub-list">
                <h3>更新失败的文章</h3>
                <ol class="content">
                    <li
                        v-for="miniArticle in result.result.failedArticles"
                        :key="miniArticle.link"
                    >
                        <a :href="miniArticle.link" target="_blank" rel="noopener noreferrer">{{ miniArticle.title || '标题获取失败' }}&nbsp;<i class="fas fa-external-link-alt external-link-icon" /></a>
                    </li>
                </ol>
            </div>
            <div v-if="noNewArticle" class="sub-list">
                <h3>无更新</h3>
            </div>
            <div v-if="hasErrMsg" class="sub-list">
                <h3>更新失败</h3>
                <p class="content">原因: {{ result.result.errMsg }}</p>
            </div>
        </div>
    </li>
</template>

<script>
import browser from '../utils/browser-polyfill';
import { constructSearchString } from '../reader/router/help-function';

export default {
    props: ['result', 'source'],
    data() {
        return {
            shouldShowContent: true
        }
    },
    computed: {
        isSuccess() {
            // logic in function-provider.js/updateArticles
            return this.result.state && !this.result.result.partiallyFailed;
        },
        isWarning() {
            return this.result.state && this.result.result.partiallyFailed;
        },
        isError() {
            return !this.result.state;
        },
        hasInserted() {
            return this.result.state && this.result.result.dbResult.inserted.length > 0;
        },
        hasUpdated() {
            return this.result.state && this.result.result.dbResult.updated.length > 0;
        },
        hasPartiallyFailed() {
            return this.result.state && this.result.result.partiallyFailed;
        },
        hasErrMsg() {
            return !this.result.state;
        },
        noNewArticle() {
            return this.isSuccess && !this.hasInserted && !this.hasUpdated;
        }
    },
    methods: {
        constructHref(sourceId, key, ver) {
            return '/reader.html#' + constructSearchString(sourceId, key, ver);
        },
        openLink(link) {
            browser.tabs.create({
                active: true,
                url: link
            });
        }
    }
}
</script>

<style lang="postcss">
@import './height-def.css';

h2 {
    font-size: .7rem;
    font-weight: normal;
}

h3 {
    font-size: .7rem;
    font-weight: bold;
}

.mini-article-list {
    margin: .5rem 0;
}

.title-container {
    position: sticky;
    top: calc($updateStatusPaddingTop + .25rem);

    width: 100%;
    overflow: hidden;

    line-height: 1.5rem;
    border-radius: 6px;
    box-shadow: 0 0 3px 0 rgba(0,0,0,.2);
    background-color: white;
    user-select: none;

    cursor: default;

    & > .source-title {
        padding-right: 1rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;

        & > .status-icon {
            margin-right: .25em;
        }

        & > .icon-error {
            color: red;
        }
        & > .icon-warning {
            color: orange;
        }
        & > .icon-success {
            color: green;
        }
    }

    & > .arrow {
        float: right;
        margin-left: -1rem;

        position: relative;
        top: .3rem;

        font-size: .9rem;
        color: black;
    }

    &.show-content {
        box-shadow: 0 1px 3px 2px rgba(0,0,0,.1);

        & > .arrow {
            transform: rotate(-90deg);
        }
    }
}

.sub-list {
    margin: .5rem 0;
}

.content {
    font-size: .7rem;
    font-weight: normal;
    width: 100%;

    & > li {
        display: list-item;
        list-style-type: disc;
    }

    & .external-link-icon {
        color: black;
    }
}
</style>

