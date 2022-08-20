<template>
    <ol class="version-indicator-container">
        <li
            v-for="(version, i) in article.versions"
            :key="version.hash"
            class="version-indicator-item"
            :class="{'version-indicator-selected': i === currVerIndex, 'has-not-read': !version.hasRead}"
            @click="$emit('clickver', i)"
        >
            <a
                :href="'#' + constructSearchString(article.sourceId, article.key, i)"
                @click.prevent
            >{{ i + 1 }}</a>
        </li>
    </ol>
</template>

<script>
import { constructSearchString } from '../router/help-function';

export default {
    props: {
        article: Object,
        currVerIndex: Number
    },
    methods: {
        constructSearchString
    }
}
</script>

<style lang="postcss" scoped>
.version-indicator-container {
    overflow: hidden;
    font-size: .7rem;
    line-height: 1rem;
    padding: .2rem 0;
}

.version-indicator-container::before {
    content: '版本: ';
}

.version-indicator-item {
    display: inline-block;

    height: 1rem;
    min-width: 1rem;
    margin-right: .4rem;

    background-color: rgba(0,0,0,.1);

    text-align: center;

    & > a {
        text-decoration: none;
    }
}

.has-not-read {
    font-weight: bold;
}
.version-indicator-selected {
    background-color: rgba(0,0,0,.2);
}
</style>

