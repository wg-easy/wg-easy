<template>
  <BaseSwitch
    v-model="enabled"
    :title="client.enabled ? $t('disableClient') : $t('enableClient')"
    @click="toggleClient"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  client: LocalClient;
}>();

const enabled = ref(props.client.enabled);

const clientsStore = useClientsStore();

async function toggleClient() {
  try {
    if (props.client.enabled) {
      await $fetch(`/api/client/${props.client.id}/disable`, {
        method: 'post',
      });
    } else {
      await $fetch(`/api/client/${props.client.id}/enable`, {
        method: 'post',
      });
    }
  } catch (err) {
    alert(err);
  } finally {
    clientsStore.refresh().catch(console.error);
  }
}
</script>
