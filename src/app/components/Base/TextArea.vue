<template>
  <textarea v-model="data" class="ui-input min-h-24 resize-y font-mono" />
</template>

<script lang="ts" setup>
const data = defineModel<string>();
</script>
