<template>
    <li class="source-info-card" :class="{'item-selected': selected}">
        <a
            :href="'#sourceId=' + source.storageKey"
            @click.prevent
            class="source-info-card-title"
        >{{ source.settings.displayName }}</a>
        <div class="last-update-container">
            <time
                :datetime="source.lastUpdate"
                title="上次更新时间"
                class="base-time"
            >{{ getReadableString(now, source.lastUpdate) }}</time>

            <i class="icon-paused" v-if="source.settings.updatePaused" title="自动更新暂停" />

            <i
                v-if="source.updateStatus === 'error'"
                :title="source.updateErrorMessage"
                class="fas fa-exclamation-triangle icon-error"
            />
            <i
                v-else-if="source.updateStatus === 'warning'"
                title="部分文章抓取失败, 点击查看失败列表"
                @click='source.showWarning = !source.showWarning'
                class="fas fa-exclamation-circle icon-warning"
            />
            <i
                v-else-if="source.updateStatus === 'success'"
                title="更新成功"
                class="fas fa-check-circle icon-success"
            />
            <i
                v-else-if="source.updateStatus === 'updating'"
                title="更新中"
                class="fas fa-sync icon-updating"
            />
        </div>
        <div v-if="source.updateStatus === 'warning' && source.showWarning" class="source-info-failed-art-list-container">
            <ul class="source-info-failed-art-list">
                <li v-for="errArt in source.updateWarningArticles" class="source-info-failed-art">
                    <a :href="errArt.link" target="_blank" rel="noopener noreferrer">
                        {{ errArt.title?errArt.title:'未能获取标题' }}
                        <i class="fas fa-external-link-alt external-link-icon" />
                    </a>
                </li>
            </ul>
        </div>
    </li>
</template>

<script>
import { getReadableTimeString } from '../../utils/time-transform.js';
const firstDayOfTheWorld = (new Date(0)).toISOString();

export default {
    props: {
        source: {
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
    methods: {
        getReadableString(now, str) {
            // method不能自动处理依赖
            if(str === firstDayOfTheWorld)
                return '从未更新';
            else
                return getReadableTimeString(now, str);
        }
    }
}
</script>

<style lang="postcss">
@import '../../base-components/text-overflow-blur.css';
@import '../../article-list/colors.def.css';
@import '../colors.def.css';

.source-info-card {
    border-bottom: 1px solid $listItemBorderColor;
    border-top: 1px solid $listItemBorderColor;

    margin-bottom: -1px;

    padding-top: .8rem;
    padding-bottom: .8rem;
    padding-right: .4rem;

    background-color: $listItemBgcolor;

    cursor: default;
    
    &.item-selected {
        background-color: $bgcolorNormal;
        .source-info-card-title::after {
            @include blur-gradient($bgcolorNormal);
        }
    }

    &:hover {
        background-color: $listItemBgcolorHover;
        .source-info-card-title::after {
            @include blur-gradient($listItemBgcolorHover);
        }
    }

    &:active {
        background-color: $listItemBgcolorActive;
        .source-info-card-title::after {
            @include blur-gradient($listItemBgcolorActive);
        }
    }

    .source-info-card-title {
        position: relative;
        display: block;
        line-height: 1.5;
        font-size: .9rem;
        max-height: 2.7rem;
        overflow: hidden;
        overflow-wrap: break-word;

        text-decoration: none;
        cursor: default;
        &::after {
            @include overflow-blur(1.5em, $listItemBgcolor);
        }

    }
}

.last-update-container {
    font-size: .7rem;
    margin-top: .4rem;
    height: .7rem;
    & > i {
        float: right;
        margin-left: .5em;
        height: 100%;
    }
}

.source-info-failed-art-list-container {
    padding-top: .4rem;
    font-size: .7rem;
}

.source-info-failed-art-list {
    line-height: 1.5;
    margin-left: -1rem;
}

.source-info-failed-art {
    position: relative;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    padding-left: 1rem;

    &::before {
        /* CSS painting XD */
        content: '';

        box-sizing: border-box;
        /* just to show the dish */
        position: absolute;
        top: .175rem;
        left: .15rem;

        height: .7rem;
        width: .7rem;
        border-radius: .5rem;
        border: 3px solid black;
        transform: scale(.5);
    }

    .external-link-icon {
        color: black;
    }
}

.icon-paused {
    color: transparent;

    &::before {
        /* Another CSS painting */
        content: '0';
        position: relative;
        top: 10%;

        display: block;
        height: 80%;
        width: .2em;
        border-left: .1rem solid gray;
        border-right: .1rem solid gray;
    }
}

.icon-success {
    color: green;
}

.icon-warning {
    color: orange;
}

.icon-error {
    color: red;
}

.icon-updating {
    color: gray;

    animation-name: spin;
    animation-duration: 2s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
}

</style>
