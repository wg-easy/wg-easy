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
        <FormDateField
          id="expiresAt"
          v-model="expiresAt"
          :label="$t('clients.fields.expiresAt.label')"
          :description="$t('clients.fields.expiresAt.description')"
        />
        <CollapsibleRoot class="mt-2 rounded-lg border border-line">
          <CollapsibleTrigger
            class="group flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover data-[state=open]:rounded-b-none data-[state=open]:bg-surface-raised"
          >
            <SlidersHorizontalIcon
              class="size-4 text-muted"
              aria-hidden="true"
            />
            {{ $t('common.form.sections.advanced') }}
            <ChevronDownIcon
              class="ms-auto size-4 text-subtle transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent class="grid gap-2 px-3 pt-2 pb-3">
            <FormTextField
              id="devicePublicKey"
              v-model="publicKey"
              :label="$t('clients.keys.publicKey')"
              :description="$t('clients.create.publicKeyHint')"
              autocomplete="off"
            />
          </CollapsibleContent>
        </CollapsibleRoot>
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
import { ChevronDownIcon, SlidersHorizontalIcon } from '@lucide/vue';

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
