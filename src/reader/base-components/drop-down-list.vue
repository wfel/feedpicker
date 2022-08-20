<template>
    <div class="drop-down-list" @click="toggleList">
        <slot name="header" />
        <div v-show="shouldShowList" class="drop-down-list-container">
            <slot name="drop-down-items" />
        </div>
    </div>
</template>

<script>
import { onOuterClick } from '../utils/event-enhance';

export default {
    data() {
        return {
            shouldShowList: false
        }
    },
    methods: {
        toggleList() {
            if(this.shouldShowList) {
                this.myListenerRemover();
                this.myListenerRemover = undefined;
                this.shouldShowList = false;
            } else {
                if(this.myListenerRemover) this.myListenerRemover();
                this.shouldShowList = true;
                // 在这个button上的点击事件会冒泡到window上，而我又不想取消冒泡（因为这个点击事件可能会被用于收起其他下拉列表或弹窗
                // Vue.$nextTick可能是一个microtask，会插在eventListener的callback之间执行
                setTimeout(() => {
                    // 防止这个click事件触发列表收起事件
                    this.myListenerRemover = onOuterClick(this.$root, null, () => {
                            console.log('close drop list fired');
                            this.shouldShowList = false;
                        },
                        true);
                }, 0);
            }
        }
    }
}
</script>

<style lang="postcss" scoped>
.drop-down-list {
    /* pass height and weight down to children */
    height: 100%;
    width: 100%;
}

.drop-down-list-container {
    /* pass height and weight down to children */
    height: 100%;
    width: 100%;
}
</style>

