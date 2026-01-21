<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('client.config') }}
    </template>
    <template #description>
      <div v-if="status === 'success'">
        <BaseCodeBlock :code="config ?? ''" />
      </div>
      <div v-else>
        <span>{{ $t('general.loading') }}</span>
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="copyCode">
          {{ $t('copy.copy') }}
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

const { data: config, status } = useFetch(
  `/api/client/${props.clientId}/configuration`,
  {
    responseType: 'text',
    server: false,
  }
);

async function copyCode() {
  if (status.value !== 'success') {
    return;
  }

  if (!isSupported.value) {
    toast.showToast({
      type: 'error',
      message: $t('copy.notSupported'),
    });
    return;
  }

  await copy(config.value ?? '');

  if (copied.value) {
    toast.showToast({
      type: 'success',
      message: $t('copy.copied'),
    });
  } else {
    toast.showToast({
      type: 'error',
      message: $t('copy.failed'),
    });
  }
}
</script>
