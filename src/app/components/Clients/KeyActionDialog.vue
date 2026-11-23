<template>
  <BaseDialog
    :trigger-disabled="disabled"
    trigger-class="disabled:cursor-not-allowed disabled:opacity-50"
    @update:open="publicKey = ''"
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
      <div v-if="action === 'replacePublicKey'" class="mt-4 grid gap-2">
        <FormTextField
          id="replacementPublicKey"
          v-model="publicKey"
          :label="$t('clients.keys.publicKey')"
          autocomplete="off"
        />
      </div>
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
          :disabled="
            disabled || (action === 'replacePublicKey' && !publicKey.trim())
          "
          @click="$emit('confirm', publicKey)"
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
    | 'replacePublicKey'
    | 'rotateKeyPair';
  clientName: string;
  disabled?: boolean;
}>();

const publicKey = ref('');
defineEmits<{ confirm: [publicKey: string] }>();
</script>
