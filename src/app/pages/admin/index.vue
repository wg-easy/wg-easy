<template>
  <div>
    This is the Admin Panel. Your are running wg-easy
    {{ globalStore.currentRelease }}
  </div>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
</script>
