<template>
  <div>
    <p class="p-8 text-center text-lg">
      {{ $t('setup.existingSetup') }}
    </p>
    <div class="mb-8 flex justify-center">
      <NuxtLink to="/setup/4">
        <BaseButton>{{ $t('general.no') }}</BaseButton>
      </NuxtLink>
      <NuxtLink to="/setup/migrate">
        <BaseButton>{{ $t('general.yes') }}</BaseButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(3);
</script>
