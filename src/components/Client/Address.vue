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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 inline align-middle opacity-25 hover:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
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
