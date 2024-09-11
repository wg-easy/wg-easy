<template>
  <div>Admin Area</div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();
</script>
