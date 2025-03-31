<template>
  <BaseDialog>
    <template #trigger>
      <slot />
    </template>
    <template #description>
      <div class="bg-white">
        <img :src="qrCode" />
      </div>
    </template>
    <template #actions>
      <DialogClose>
        <BaseButton>{{ $t('dialog.cancel') }}</BaseButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineProps<{ qrCode: string }>();
</script>
