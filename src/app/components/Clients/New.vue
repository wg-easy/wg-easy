<template>
  <BaseButton
    @click="
      modalStore.clientCreate = true;
      modalStore.clientCreateName = '';
      modalStore.clientExpireDate = '';
    "
  >
    <IconsPlus class="w-4 md:mr-2" />
    <span class="text-sm max-md:hidden">{{ $t('new') }}</span>
  </BaseButton>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
