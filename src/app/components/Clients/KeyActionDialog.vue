<template>
  <BaseDialog
    :trigger-disabled="disabled"
    trigger-class="disabled:cursor-not-allowed disabled:opacity-50"
  >
    <template #trigger>
      <BaseSecondaryButton as="span" class="w-full">
        {{ $t(`client.${action}`) }}
      </BaseSecondaryButton>
    </template>
    <template #title>{{ $t(`client.${action}`) }}</template>
    <template #description>
      <i18n-t :keypath="`client.${action}Dialog`">
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
        <BaseSecondaryButton
          class="ui-button-danger"
          :disabled="disabled"
          @click="$emit('confirm')"
        >
          {{ $t(`client.${action}`) }}
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
