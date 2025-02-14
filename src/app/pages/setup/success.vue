<template>
  <div>
    <p>{{ $t('setup.successful') }}</p>
    <NuxtLink to="/login">
      <BaseButton>{{ $t('login.signIn') }}</BaseButton>
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
