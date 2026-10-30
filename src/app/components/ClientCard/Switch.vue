<template>
  <BaseSwitch
    :model-value="enabled"
    :title="
      client.enabled
        ? $t('clients.status.disable')
        : $t('clients.status.enable')
    "
    :aria-label="
      client.enabled
        ? $t('clients.status.disable')
        : $t('clients.status.enable')
    "
    @update:model-value="toggleClient"
  />
</template>

<script setup lang="ts">
import { $fetch } from '#imports';

const props = defineProps<{
  client: LocalClient;
}>();

const enabled = ref(props.client.enabled);

watch(
  () => props.client.enabled,
  (value) => {
    enabled.value = value;
  }
);

const clientsStore = useClientsStore();

const submit = useSubmit(
  (enabled: boolean) =>
    $fetch(`/api/client/${props.client.id}/${enabled ? 'enable' : 'disable'}`, {
      method: 'post',
    }),
  {
    revert: () => clientsStore.refresh(),
    noSuccessToast: true,
  }
);

async function toggleClient(nextEnabled: boolean | undefined) {
  if (nextEnabled === undefined) return;

  // Update immediately while the request and store refresh are in progress.
  enabled.value = nextEnabled;

  try {
    await submit(nextEnabled);
  } finally {
    // A failed toggle leaves the server value unchanged, so the watcher won't run.
    enabled.value = props.client.enabled;
  }
}
</script>
