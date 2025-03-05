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
  `/api/client/${props.client.id}/disable`,
  {
    method: 'post',
  },
  {
    revert: async () => {
      await clientsStore.refresh();
    },
    noSuccessToast: true,
  }
);

const _enableClient = useSubmit(
  `/api/client/${props.client.id}/enable`,
  {
    method: 'post',
  },
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
