<template>
  <button
    type="button"
    class="icon-button"
    :title="$t('clients.configuration.copy')"
    :aria-label="$t('clients.configuration.copy')"
    :disabled="copying"
    @click="copyConfig"
  >
    <CopyIcon class="size-4" />
  </button>
</template>

<script setup lang="ts">
import { CopyIcon } from '@lucide/vue';

const props = defineProps<{
  client: LocalClient;
}>();

const toast = useToast();
const copying = ref(false);

async function copyConfig() {
  copying.value = true;
  try {
    const config = await $fetch<string>(
      `/api/client/${props.client.id}/configuration`,
      { responseType: 'text' }
    );
    const copied = await copyText(config);
    toast.showToast({
      type: copied ? 'success' : 'error',
      message: copied
        ? $t('common.clipboard.copied')
        : $t('common.clipboard.failed'),
    });
  } catch {
    toast.showToast({
      type: 'error',
      message: $t('common.clipboard.failed'),
    });
  } finally {
    copying.value = false;
  }
}
</script>
