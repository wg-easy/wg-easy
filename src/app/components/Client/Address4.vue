<template>
  <span class="group">
    <!-- Show -->
    <input
      v-show="clientEditAddress4Id === client.id"
      ref="clientAddress4Input"
      v-model="clientEditAddress4"
      class="rounded border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 outline-none w-20 text-black dark:text-neutral-300 dark:placeholder:text-neutral-500"
      @keyup.enter="
        updateClientAddress4(client, clientEditAddress4);
        clientEditAddress4 = null;
        clientEditAddress4Id = null;
      "
      @keyup.escape="
        clientEditAddress4 = null;
        clientEditAddress4Id = null;
      "
    />
    <span v-show="clientEditAddress4Id !== client.id" class="inline-block">{{
      client.address4
    }}</span>

    <!-- Edit -->
    <span
      v-show="clientEditAddress4Id !== client.id"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
      @click="
        clientEditAddress4 = client.address4;
        clientEditAddress4Id = client.id;
        nextTick(() => clientAddress4Input?.select());
      "
    >
      <IconsEdit
        class="h-4 w-4 inline align-middle opacity-25 hover:opacity-100"
      />
    </span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();

const clientsStore = useClientsStore();

const clientAddress4Input = ref<HTMLInputElement | null>(null);
const clientEditAddress4 = ref<null | string>(null);
const clientEditAddress4Id = ref<null | string>(null);

function updateClientAddress4(client: WGClient, address4: string | null) {
  if (address4 === null) {
    return;
  }
  api
    .updateClientAddress4({ clientId: client.id, address4 })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => clientsStore.refresh().catch(console.error));
}
</script>
