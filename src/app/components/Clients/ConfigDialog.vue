<template>
  <BaseDialog :trigger-class="triggerClass" @update:open="loadOnOpen">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('clients.configuration.title') }}
    </template>
    <template #description>
      <div v-if="status === 'success'">
        <BaseCodeBlock :code="config ?? ''" />
      </div>
      <div v-else>
        <span>{{ $t('common.loading') }}</span>
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>
          {{ $t('common.actions.cancel') }}
        </BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="copyCode">
          {{ $t('common.clipboard.copy') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
const props = defineProps<{ triggerClass?: string; clientId: number }>();

const toast = useToast();
const { copied, copy, isSupported } = useClipboard({
  // fallback does not work
  legacy: false,
});

const {
  data: config,
  status,
  refresh,
} = useFetch(`/api/client/${props.clientId}/configuration`, {
  responseType: 'text',
  server: false,
  immediate: false,
});

async function loadOnOpen(open: boolean) {
  if (!open) return;

  await refresh();
}

async function copyCode() {
  if (status.value !== 'success') {
    return;
  }

  if (!isSupported.value) {
    toast.showToast({
      type: 'error',
      message: $t('common.clipboard.notSupported'),
    });
    return;
  }

  await copy(config.value ?? '');

  if (copied.value) {
    toast.showToast({
      type: 'success',
      message: $t('common.clipboard.copied'),
    });
  } else {
    toast.showToast({
      type: 'error',
      message: $t('common.clipboard.failed'),
    });
  }
}
</script>
