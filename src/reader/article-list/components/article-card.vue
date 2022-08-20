<template>
    <li
        class="article-card"
        :class="{'card-selected': selected}"
        @click="emitOpenArticle"
    >
        <!-- {{ article.id }} -->
        <!-- this card displays the information of article's current version -->
        <div class="upper-container">
            <a
                :href="'#' + constructSearchString(article.sourceId, article.key, article.currentVersionIndex)"
                @click.prevent
                class="currver-title"
                :class="{'has-not-read': !article.read}"
            >{{ currVer.title }}</a>
            <time :datetime="currVer.date.toISOString()" class="currver-date base-time" title="发布日期">{{ currVerReadableDate }}</time>
        </div>
        <div>
            <!-- let the click event buble up and triggers emitOpenArticle -->
            <version-indicator
                :article="article"
                :curr-ver-index="article.currentVersionIndex"
                @clickver="$emit('set-curr-ver', $event)"
            />
        </div>
    </li>
</template>

<script>
import { constructSearchString } from '../../router/help-function';
import { getReadableTimeString } from '../../utils/time-transform';

import versionIndicator from '../../base-components/version-indicator.vue';

export default {
    components: {
        versionIndicator
    },
    props: {
        article: {
            type: Object,
            required: true
        },
        now: {
            type: Date,
            required: true
        },
        selected: {
            type: Boolean,
            required: true
        }
    },
    data() {
        return {};
    },
    computed: {
        currVer() {
            return this.article.versions[this.article.currentVersionIndex];
        },
        currVerReadableDate() {
            return getReadableTimeString(this.now, this.currVer.date);
        }
    },
    methods: {
        constructSearchString,
        emitOpenArticle() {
            this.$emit('open-article', {
                sourceId: this.article.sourceId,
                key: this.article.key,
                primaryKey: this.article.id,
                verIndex: this.article.currentVersionIndex
            });
        }
    }
}
</script>

<style lang="postcss" scoped>
@import '../../base-components/text-overflow-blur.css';
@import '../colors.def.css';
$bgcolorHover: #ededed;
$bgcolorActive: #e3e3e3;
$bgcolorSelected: #e7e7e7;

.article-card {
    padding-top: .8rem;
    padding-bottom: .8rem;
    background-color: $bgcolorNormal;

    & > .upper-container {
        display: flex;
        font-size: .8rem;
        
        line-height: 1.5;
    }

    .currver-title {
        position: relative;
        display: block;
        flex: 1;

        max-height: 2.4rem;

        text-decoration: none;
        overflow: hidden;
        overflow-wrap: break-word;

        &.has-not-read {
            font-weight: bold;
        }

        &::after {
            @include overflow-blur(1.5em, $bgcolorNormal);
        }
    }
    
    &.card-selected {
        background-color: $bgcolorSelected;
        .currver-title::after{
            @include blur-gradient($bgcolorSelected);
        }
    }

    &:hover {
        background-color: $bgcolorHover;
        .currver-title::after {
            @include blur-gradient($bgcolorHover);
        }
    }

    &:active {
        background-color: $bgcolorActive;
        .currver-title::after{
            @include blur-gradient($bgcolorActive);
        }
    }
}

.currver-date {
    display: block;
    align-self: center;
    font-size: .7rem;
}
</style>
