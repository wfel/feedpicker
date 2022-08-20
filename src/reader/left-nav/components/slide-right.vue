<template>
    <div class="slide-window-container">
        <div class="slide-window-title slide-window-vertical-padding">
            <h2><slot name="title" /></h2>
            <button type="button" @click="clickClose" class="slide-window-close-btn">X</button>
        </div>
        <div class="slide-window-content slide-window-vertical-padding">
            <slot />
        </div>
    </div>
</template>

<script>
export default {
    methods: {
        clickClose() {
            this.$emit('clickclose');
        }
    }
}
</script>

<style lang="postcss" scoped>
.slide-window-container {
    height: 100%;
    width: 100%;
    overflow: hidden;

    display: flex;
    flex-direction: column;

    padding-top: 1rem;
}

.slide-window-vertical-padding {
    padding-left: 1rem;
    padding-right: 1rem;
}

.slide-window-title {
    position: relative;
    font-size: 1.2rem;
    line-height: 2;

    margin-bottom: .4rem;
    & > h2 {
        font-size: inherit;
    }
}

.slide-window-close-btn {
    position: absolute;
    top: 0;
    right: 0;
    width: 2rem;
}

.slide-window-content {
    flex: 1;
    padding-top: .6rem;
    overflow-x: hidden;
    overflow-y: auto;
}
</style>

