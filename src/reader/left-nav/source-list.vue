<template>
    <div>
        <div class="source-list-no-source" v-show="sourceArr.length === 0">源列表为空</div>
        <draggable
            tag="ol"
            v-model="sourceArr"
            :disabled="!(mode === 'change-order')"
            v-show="sourceArr.length > 0"
            class="source-list"
            :class="[mode]"
        >
            <source-info-card
                v-for="source in sourceArr"
                :key="source.storageKey"
                class="source-list-item left-nav-pub-horizontal-pad"
                :class="{'source-list-item-focus': innerSourceId === source.storageKey}"
                @click.native="$emit('clickcard', source.storageKey)"
                :source="source"
                :selected="innerSourceId === source.storageKey"
                :now="$store.state.now"
            />
        </draggable>
    </div>
</template>

<script>
import draggable from 'vuedraggable';
import sourceInfoCard from './components/source-info-card.vue';

export default {
    components: {
        draggable,
        sourceInfoCard,
    },
    props: {
        mode: String,
        sources: Object,
        settingsSourceId: String
    },
    computed: {
        sourceArr: {
            get() {
                // 虽然这个更新一次的代价是O(nlogn+deepdiff)，而使用sourceArr然后对每个source进行查找的代价是O(n)
                // 但sources用着爽啊
                return Object.values(this.sources).sort((sa, sb) => sa.settings.order > sb.settings.order);
            },
            set(newVal) {
                // change order
                // [sourceId, sourceId, ...]
                var res = newVal.map(source => source.storageKey);
                this.$emit('order-changed', res);
            }
        },
        innerSourceId() {
            switch(this.mode) {
                case 'normal':
                case 'create-source':
                return this.$store.state.currSourceId;
                case 'source-settings':
                return this.settingsSourceId;
                default:
                return '';
            }
        },
    },
}
</script>

<style lang="postcss">
.source-list {
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: thin;
}

.source-list-item {
}

.source-list.change-order > .source-list-item,
.source-list.source-settings > .source-list-item.source-list-item-focus {
    transform: scale(.95);
}

.source-list.change-order > .source-list-item.source-list-item-focus::before {
    
}
</style>
