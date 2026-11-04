<template>
  <BaseDialog
    :trigger-disabled="disabled"
    trigger-class="disabled:cursor-not-allowed disabled:opacity-50"
  >
    <template #trigger>
      <BaseSecondaryButton as="span" class="w-full">
        {{ $t(`clients.keys.actions.${action}.label`) }}
      </BaseSecondaryButton>
    </template>
    <template #title>{{ $t(`clients.keys.actions.${action}.label`) }}</template>
    <template #description>
      <i18n-t :keypath="`clients.keys.actions.${action}.description`">
        <template #name>
          <strong>{{ clientName }}</strong>
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
        <BaseSecondaryButton
          class="ui-button-danger"
          :disabled="disabled"
          @click="$emit('confirm')"
        >
          {{ $t(`clients.keys.actions.${action}.label`) }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineProps<{
  action:
    | 'addPreSharedKey'
    | 'rotatePreSharedKey'
    | 'removePreSharedKey'
    | 'rotateKeyPair';
  clientName: string;
  disabled?: boolean;
}>();

defineEmits<{ confirm: [] }>();
</script>
