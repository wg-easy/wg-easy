<template>
  <div>
    <p class="text-center text-lg">
      {{ $t('setup.existingSetup') }}
    </p>
    <div class="mt-4 flex justify-center gap-3">
      <NuxtLink to="/setup/4" class="w-20">
        <BaseButton as="span" class="w-full justify-center">
          {{ $t('general.no') }}
        </BaseButton>
      </NuxtLink>
      <NuxtLink to="/setup/migrate" class="w-20">
        <BaseButton as="span" class="w-full justify-center">
          {{ $t('general.yes') }}
        </BaseButton>
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
