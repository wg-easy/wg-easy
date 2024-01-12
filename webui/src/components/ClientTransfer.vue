<template>
    <span v-if="transferData" :title="title">
        ·
        <slot></slot>
        {{ transferDataCurrent }}/s
    </span>
</template>

<script>
export default {
    props: ["transferData", "transferDataCurrent", "title"],
};
</script>
