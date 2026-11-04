<template>
  <button
    class="icon-button"
    :title="$t('clients.configuration.oneTimeLink')"
    :aria-label="$t('clients.configuration.oneTimeLink')"
    @click="showOneTimeLink"
  >
    <LinkIcon class="size-4" />
  </button>
</template>

<script setup lang="ts">
import { LinkIcon } from '@lucide/vue';

import { $fetch } from '#imports';

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
