<template>
    <div class="title-bar">
        <aside class="title-icon">
            <slot name="title-icon" />
        </aside>
        <h2 class="title-bar-title">
            <slot name="title" />
        </h2>
        <div class="title-bar-right-action">
            <slot name="right-action" />
        </div>
    </div>
</template>

<style lang="postcss" scoped>
.title-bar {
    position: relative;

    height: 2rem;
    min-width: 2rem;

    font-size: .9rem;
    line-height: 2rem;
}

.title-icon {
    position: absolute;
    left: .8rem;
    top: 0;
}

.title-bar-title {
    font-size: inherit;
    cursor: default;
}

.title-bar-right-action {
    position: absolute;
    top: 0;
    right: 0;
    height: 2rem;
    width: 2rem;

    /* why? why is it useless to set z-index: 1; on .source-extend-ops? */
    z-index: 20;
}
</style>
