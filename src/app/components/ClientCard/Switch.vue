<template>
  <BaseSwitch
    :model-value="enabled"
    :title="
      client.enabled ? $t('client.disableClient') : $t('client.enableClient')
    "
    @update:model-value="toggleClient"
  />
</template>

<script setup lang="ts">
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

async function revertEnabled(success: boolean) {
  await clientsStore.refresh();
  // The watch below only runs when enabled changes. A failed request
  // leaves the server value the same, so put the local switch back.
  if (!success) {
    enabled.value = props.client.enabled;
  }
}

const _disableClient = useSubmit(
  (data) =>
    $fetch(`/api/client/${props.client.id}/disable`, {
      method: 'post',
      body: data,
    }),
  {
    revert: revertEnabled,
    noSuccessToast: true,
  }
);

const _enableClient = useSubmit(
  (data) =>
    $fetch(`/api/client/${props.client.id}/enable`, {
      method: 'post',
      body: data,
    }),
  {
    revert: revertEnabled,
    noSuccessToast: true,
  }
);

async function toggleClient(nextEnabled: boolean | undefined) {
  if (nextEnabled === undefined) return;

  // Update immediately while the request and store refresh are in progress.
  enabled.value = nextEnabled;

  if (nextEnabled) {
    await _enableClient(undefined);
  } else {
    await _disableClient(undefined);
  }
}
</script>
