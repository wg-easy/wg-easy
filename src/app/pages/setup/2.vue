<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ 'Do you have a existing Setup?' }}
    </p>
    <div class="flex justify-center mb-8">
      <NuxtLink to="/setup/3"><BaseButton>No</BaseButton></NuxtLink>
      <NuxtLink to="/setup/migrate"><BaseButton>Yes</BaseButton></NuxtLink>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'setup',
});
const setupStore = useSetupStore();
setupStore.setStep(2);
</script>
