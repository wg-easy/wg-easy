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
const toast = useToast();
const { copy, copied, isSupported } = useClipboard();

const _showOneTimeLink = useSubmit(
  `/api/client/${props.client.id}/generateOneTimeLink`,
  {
    method: 'post',
  },
  {
    revert: async () => {
      await clientsStore.refresh();
      await copyOneTimeLink();
    },
    noSuccessToast: true,
  }
);

async function copyOneTimeLink() {
  if (!isSupported) {
    toast.showToast({
      type: 'error',
      message: $t('copy.noSupport'),
    });
    return;
  }
  await nextTick();

  if (!props.client.oneTimeConfigUrl) {
    toast.showToast({
      type: 'error',
      message: $t('copy.error'),
    });
    return;
  }

  await copy(props.client.oneTimeConfigUrl);

  if (!copied.value) {
    toast.showToast({
      type: 'error',
      message: $t('copy.error'),
    });
    return;
  }

  toast.showToast({
    type: 'success',
    message: $t('copy.success'),
  });
}

function showOneTimeLink() {
  return _showOneTimeLink(undefined);
}
</script>
