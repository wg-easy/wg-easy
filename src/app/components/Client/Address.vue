<template>
  <span class="group">
    <!-- Show -->
    <input
      v-show="clientEditAddressId === client.id"
      ref="clientAddressInput"
      v-model="clientEditAddress"
      class="rounded border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 outline-none w-20 text-black dark:text-neutral-300 dark:placeholder:text-neutral-500"
      @keyup.enter="
        updateClientAddress(client, clientEditAddress);
        clientEditAddress = null;
        clientEditAddressId = null;
      "
      @keyup.escape="
        clientEditAddress = null;
        clientEditAddressId = null;
      "
    />
    <span v-show="clientEditAddressId !== client.id" class="inline-block">{{
      client.address
    }}</span>

    <!-- Edit -->
    <span
      v-show="clientEditAddressId !== client.id"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
      @click="
        clientEditAddress = client.address;
        clientEditAddressId = client.id;
        nextTick(() => clientAddressInput?.select());
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

const clientAddressInput = ref<HTMLInputElement | null>(null);
const clientEditAddress = ref<null | string>(null);
const clientEditAddressId = ref<null | string>(null);

function updateClientAddress(client: WGClient, address: string | null) {
  if (address === null) {
    return;
  }
  api
    .updateClientAddress({ clientId: client.id, address })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => clientsStore.refresh().catch(console.error));
}
</script>
