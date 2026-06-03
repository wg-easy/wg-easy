<template>
  <BaseSwitch
    v-model="enabled"
    :title="
      client.enabled ? $t('client.disableClient') : $t('client.enableClient')
    "
    @click="toggleClient"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  client: LocalClient;
}>();

const enabled = ref(props.client.enabled);

const clientsStore = useClientsStore();

const _disableClient = useSubmit(
  (data) =>
    $fetch(`/api/client/${props.client.id}/disable`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async () => {
      await clientsStore.refresh();
    },
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
    revert: async () => {
      await clientsStore.refresh();
    },
    noSuccessToast: true,
  }
);

async function toggleClient() {
  if (props.client.enabled) {
    await _disableClient(undefined);
  } else {
    await _enableClient(undefined);
  }
}
</script>
