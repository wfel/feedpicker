<template>
    <main class="app-root">
        <left-nav class="ln" />
        <article-list class="al" />
        <article-box class="ab" />
        <div
            class="mask"
            v-show="maskCbs.length"
            @click="execMaskCbs"
        />
    </main>
</template>

<script>
import * as _debounce from 'lodash/debounce';

import leftNav from '../left-nav/left-nav.vue';
import articleList from '../article-list/article-list.vue';
import articleBox from '../article-box/article-box.vue';

function calcPageWidth() {
    // see width.def.css
    var width = window.innerWidth;
    if(width > 1180) {
        // full
        return 'full';
    } else if(width > 848) {
        // medium
        return 'medium';
    } else if(width > 620) {
        // small
        return 'small';
    } else {
        // min
        return 'min';
    }
}

export default {
    components: {
        leftNav,
        articleList,
        articleBox
    },
    data: function() {
        return {
            maskCbs: []
        };
    },
    methods: {
        /**
         * show mask and add click callback on mask
         * @params {function} clickCb Once a click event is fired on mask, the clickCb will be called with event. If the returning value is true, then the callback will be removed from callback list.
         */
        addMask(clickCb) {
            this.maskCbs.push(clickCb);
        },
        execMaskCbs(event) {
            this.maskCbs.forEach((cb, i) => {
                if(cb(event)) {
                    this.maskCbs.splice(i, 1);
                }
            });
        },
        setGlobalPageWidth(widthStr) {
            this.$store.commit('setPageWidth', widthStr);
        }
    },
    provide() {
        return {
            'addGlobalMask': this.addMask
        };
    },
    created() {
        this.setGlobalPageWidth(calcPageWidth());
        window.addEventListener('resize', _debounce(
            () => this.setGlobalPageWidth(calcPageWidth()),
            200,
            {
                maxWait: 500
            }));
    }
}
</script>

<style src="./normalize.css"></style>
<style lang="postcss">
@import '../base-components/global.css';
@import '../base-components/button-reset.css';
@import '../base-components/spin.css';

@import '../base-components/inset-shadow.css';
@import '../base-components/time-elem.css';

@import './border-color.def.css';
@import './width.def.css';

* {
    box-sizing: border-box;
}
html {
    /* 20px */
    font-size: 1.25em;
    line-height: 1;
}
html, body {
    height: 100%;
    width: 100%;
}
body {
    min-width: $minWidth;
}
.app-root {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    overflow: hidden;
}

.ln, .al, .ab {
    height: 100%;
}
@media (min-width: $fullWidth) {
    .mask {
        display: none;
    }
}

@media (min-width: $mediumWidth) and (max-width: $lessFullWidth) {
    .mask {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;

        z-index: 10;

        background-color: rgba(0,0,0, .2);
    }
}
</style>

