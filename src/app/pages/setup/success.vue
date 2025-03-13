<template>
  <div class="flex flex-col items-center">
    <p>{{ $t('setup.successful') }}</p>
    <NuxtLink to="/login" class="mt-4">
      <BaseButton as="span">{{ $t('login.signIn') }}</BaseButton>
    </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(6);
</script>
