<template>
  <div class="flex flex-col items-center">
    <p class="text-sm leading-relaxed text-muted">
      {{ $t('setup.welcomeDesc') }}
    </p>
    <NuxtLink to="/setup/2" class="mt-8">
      <BasePrimaryButton as="span">
        {{ $t('general.continue') }}
      </BasePrimaryButton>
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
