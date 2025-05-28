<template>
  <div class="flex flex-col items-center">
    <p>{{ $t('setup.successful') }}</p>
    <NuxtLink to="/login" class="mt-4">
      <BasePrimaryButton as="span">{{ $t('login.signIn') }}</BasePrimaryButton>
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
