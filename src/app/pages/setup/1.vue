<template>
  <div class="flex flex-col items-center">
    <p class="px-8 text-center text-2xl">
      {{ $t('setup.welcomeDesc') }}
    </p>
    <NuxtLink to="/setup/2" class="mt-8">
      <BaseButton as="span">{{ $t('general.continue') }}</BaseButton>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(1);
</script>
