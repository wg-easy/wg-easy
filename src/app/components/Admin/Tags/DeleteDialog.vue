<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('admin.tags.delete.title') }}</template>
    <template #description>
      <i18n-t keypath="admin.tags.delete.description">
        <template #name>
          <strong>{{ tagName }}</strong>
        </template>
      </i18n-t>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>
          {{ $t('common.actions.cancel') }}
        </BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseSecondaryButton class="ui-button-danger" @click="$emit('delete')">
          {{ $t('admin.tags.delete.title') }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['delete']);
defineProps<{ triggerClass?: string; tagName: string }>();
</script>
