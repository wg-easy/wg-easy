<template>
  <button
    class="icon-button"
    :title="$t('client.otlDesc')"
    :aria-label="$t('client.otlDesc')"
    @click="showOneTimeLink"
  >
    <IconsLink class="size-4" />
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();

const clientsStore = useClientsStore();

const _showOneTimeLink = useSubmit(
  (data) =>
    $fetch(`/api/client/${props.client.id}/generateOneTimeLink`, {
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

function showOneTimeLink() {
  return _showOneTimeLink(undefined);
}
</script>
