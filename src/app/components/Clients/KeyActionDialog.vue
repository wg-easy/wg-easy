<template>
  <BaseDialog
    :trigger-disabled="disabled"
    trigger-class="ui-button ui-button-secondary"
    @update:open="publicKey = initialPublicKey ?? ''"
  >
    <template #trigger>
      {{ label }}
    </template>
    <template #title>{{ label }}</template>
    <template #description>
      <i18n-t :keypath="`clients.keys.actions.${action}.description`">
        <template #name>
          <strong>{{ clientName }}</strong>
        </template>
      </i18n-t>
      <div v-if="needsPublicKey" class="mt-4 grid gap-2">
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
          :disabled="disabled || (needsPublicKey && !publicKey.trim())"
          @click="$emit('confirm', action, publicKey)"
        >
          {{ label }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
type KeyAction =
  | 'addPreSharedKey'
  | 'rotatePreSharedKey'
  | 'removePreSharedKey'
  | 'replacePublicKey'
  | 'rotateKeyPair'
  | 'useDeviceKey'
  | 'useManagedKey';
const props = defineProps<{
  action: KeyAction;
  clientName: string;
  initialPublicKey?: string;
  disabled?: boolean;
}>();

const publicKey = ref('');
const needsPublicKey = computed(
  () => props.action === 'replacePublicKey' || props.action === 'useDeviceKey'
);
const { t } = useI18n();
const label = computed(() => t(`clients.keys.actions.${props.action}.label`));
defineEmits<{ confirm: [action: KeyAction, publicKey: string] }>();
</script>
