<template>
  <div>
    <p class="p-8 text-center text-lg">
      {{ $t('setup.messageSetupLanguage') }}
    </p>
    <div class="mb-8 flex justify-center">
      <UiChooseLang />
    </div>
    <div>
      <NuxtLink to="/setup/2"><BaseButton>Continue</BaseButton></NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(1);
</script>
