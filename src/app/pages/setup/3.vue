<template>
  <div>
    <p class="px-8 pt-8 text-center text-2xl">
      {{ $t('setup.messageWelcome.whatIs') }}
    </p>
    <NuxtLink to="/setup/4"><BaseButton>Continue</BaseButton></NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'setup',
});
const setupStore = useSetupStore();
setupStore.setStep(3);
</script>
