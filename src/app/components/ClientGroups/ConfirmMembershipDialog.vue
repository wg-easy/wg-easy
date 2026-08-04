<template>
  <BaseDialog
    :trigger-class="triggerClass"
    :trigger-aria-label="triggerAriaLabel"
    :trigger-title="triggerTitle"
  >
    <template #trigger><slot /></template>
    <template #title>{{ title }}</template>
    <template #description>
      {{ description }}
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="$emit('confirm')">
          {{ confirmLabel }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits<{
  confirm: [];
}>();

defineProps<{
  triggerClass?: string;
  triggerAriaLabel?: string;
  triggerTitle?: string;
  title: string;
  description: string;
  confirmLabel: string;
}>();
</script>
