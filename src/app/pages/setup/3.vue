<template>
  <div>
    <p class="text-2xl pt-8 px-8 text-center">
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
