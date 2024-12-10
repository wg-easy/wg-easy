<template>
  <div>
    <p>Setup successfully</p>
    <NuxtLink to="/login"><BaseButton>Login</BaseButton></NuxtLink>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'setup',
});
const setupStore = useSetupStore();
setupStore.setStep(6);
</script>
