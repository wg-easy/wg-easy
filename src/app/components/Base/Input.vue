<template>
  <input v-model="data" class="ui-input" />
</template>

<script lang="ts" setup>
const data = defineModel<unknown>();
</script>
