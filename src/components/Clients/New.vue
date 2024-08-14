<template>
  <BaseButton
    @click="
      modalStore.clientCreate = true;
      modalStore.clientCreateName = '';
    "
  >
    <IconsPlus />
    <span class="max-md:hidden text-sm">{{ $t('new') }}</span>
  </BaseButton>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
