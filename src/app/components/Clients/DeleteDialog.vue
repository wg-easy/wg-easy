<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('client.deleteClient') }}</template>
    <template #description>
      <i18n-t keypath="client.deleteDialog">
        <template #name>
          <strong>{{ clientName }}</strong>
        </template>
      </i18n-t>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseSecondaryButton class="ui-button-danger" @click="$emit('delete')">
          {{ $t('client.deleteClient') }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['delete']);
defineProps<{ triggerClass?: string; clientName: string }>();
</script>
