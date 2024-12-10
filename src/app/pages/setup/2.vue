<template>
  <div>
    <p class="p-8 text-center text-lg">
      {{ 'Do you have a existing Setup?' }}
    </p>
    <div class="mb-8 flex justify-center">
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
