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
  if (!open) {
    return;
  }

  await refresh();
}

async function copyCode() {
  if (status.value !== 'success') {
    return;
  }

  const copied = await copyText(config.value ?? '');
  toast.showToast({
    type: copied ? 'success' : 'error',
    message: copied
      ? $t('common.clipboard.copied')
      : $t('common.clipboard.failed'),
  });
}
</script>
