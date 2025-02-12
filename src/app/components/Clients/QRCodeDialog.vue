<template>
  <BaseDialog>
    <template #trigger>
      <slot />
    </template>
    <template #description>
      <img :src="qrCode" />
    </template>
    <template #actions>
      <DialogClose>
        <BaseButton>{{ $t('cancel') }}</BaseButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineProps<{ qrCode: string }>();
</script>
