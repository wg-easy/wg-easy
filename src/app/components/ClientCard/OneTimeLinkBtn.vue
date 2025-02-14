<template>
  <button
    class="inline-block rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
    :title="$t('client.otlDesc')"
    @click="showOneTimeLink"
  >
    <IconsLink class="w-5" />
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();

const clientsStore = useClientsStore();

const _showOneTimeLink = useSubmit(
  `/api/client/${props.client.id}/generateOneTimeLink`,
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

function showOneTimeLink() {
  return _showOneTimeLink(undefined);
}
</script>
