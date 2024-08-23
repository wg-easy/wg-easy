<template>
  <div
    class="text-gray-700 dark:text-neutral-200 group text-sm md:text-base"
    :title="$t('createdOn') + dateTime(new Date(client.createdAt))"
  >
    <!-- Show -->
    <input
      v-show="clientEditNameId === client.id"
      ref="clientNameInput"
      v-model="clientEditName"
      class="rounded px-1 border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 dark:placeholder:text-neutral-500 outline-none w-30"
      @keyup.enter="
        updateClientName(client, clientEditName);
        clientEditName = null;
        clientEditNameId = null;
      "
      @keyup.escape="
        clientEditName = null;
        clientEditNameId = null;
      "
    />
    <span
      v-show="clientEditNameId !== client.id"
      class="border-t-2 border-b-2 border-transparent"
      >{{ client.name }}</span
    >

    <!-- Edit -->
    <span
      v-show="clientEditNameId !== client.id"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
      @click="
        clientEditName = client.name;
        clientEditNameId = client.id;
        nextTick(() => clientNameInput?.select());
      "
    >
      <IconsEdit
        class="h-4 w-4 inline align-middle opacity-25 hover:opacity-100"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();

const clientsStore = useClientsStore();

const clientNameInput = ref<HTMLInputElement | null>(null);
const clientEditName = ref<null | string>(null);
const clientEditNameId = ref<null | string>(null);

function updateClientName(client: LocalClient, name: string | null) {
  if (name === null) {
    return;
  }
  api
    .updateClientName({ clientId: client.id, name })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => clientsStore.refresh().catch(console.error));
}
</script>
