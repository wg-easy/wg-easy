<template>
  <BaseDialog :trigger-class="triggerClass" @update:open="resetOnOpen">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('clients.create.title') }}
    </template>
    <template #description>
      <div class="flex flex-col gap-2">
        <FormTextField
          id="name"
          v-model="name"
          :label="$t('clients.fields.name.label')"
        />
        <FormTextField
          id="devicePublicKey"
          v-model="publicKey"
          :label="$t('clients.keys.publicKey')"
          :description="$t('clients.create.publicKeyHint')"
          autocomplete="off"
        />
        <FormDateField
          id="expiresAt"
          v-model="expiresAt"
          :label="$t('clients.fields.expiresAt.label')"
          :description="$t('clients.fields.expiresAt.description')"
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
        <BasePrimaryButton :disabled="!name.trim()" @click="createClient">
          {{ $t('clients.create.action') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import { $fetch } from '#imports';

const name = ref<string>('');
const publicKey = ref('');
const expiresAt = ref<string | null>(null);
const clientsStore = useClientsStore();

const { t } = useI18n();

defineProps<{ triggerClass?: string }>();

function resetOnOpen(open: boolean) {
  if (!open) {
    return;
  }

  name.value = '';
  publicKey.value = '';
  expiresAt.value = null;
}

function createClient() {
  return _createClient({
    name: name.value,
    publicKey: publicKey.value || undefined,
    expiresAt: expiresAt.value,
  });
}

const _createClient = useSubmit(
  (data) =>
    $fetch('/api/client', {
      method: 'post',
      body: data,
    }),
  {
    revert: () => clientsStore.refresh(),
    successMsg: t('clients.create.success'),
  }
);
</script>
