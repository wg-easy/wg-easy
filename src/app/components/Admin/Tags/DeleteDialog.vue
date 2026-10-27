<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('admin.tags.deleteTag') }}</template>
    <template #description>
      <i18n-t keypath="admin.tags.deleteDialog">
        <template #name>
          <strong>{{ tagName }}</strong>
        </template>
      </i18n-t>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BasePrimaryButton>{{ $t('dialog.cancel') }}</BasePrimaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseSecondaryButton @click="$emit('delete')">
          {{ $t('admin.tags.deleteTag') }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['delete']);
defineProps<{ triggerClass?: string; tagName: string }>();
</script>
