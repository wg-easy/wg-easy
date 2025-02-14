<template>
  <div>
    <p class="px-8 pt-8 text-center text-2xl">
      {{ $t('setup.welcomeDesc') }}
    </p>
    <NuxtLink to="/setup/2">
      <BaseButton>{{ $t('general.continue') }}</BaseButton>
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
