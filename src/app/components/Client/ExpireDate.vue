<template>
  <div
    v-show="globalStore.features.clientExpiration.enabled"
    class="block md:inline-block pb-1 md:pb-0 text-gray-500 dark:text-neutral-400 text-xs"
  >
    <span class="group">
      <!-- Show -->
      <input
        v-show="clientEditExpireDateId === client.id"
        ref="clientExpireDateInput"
        v-model="clientEditExpireDate"
        type="text"
        class="rounded border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 outline-none w-70 text-black dark:text-neutral-300 dark:placeholder:text-neutral-500 text-xs p-0"
        @keyup.enter="
          updateClientExpireDate(client, clientEditExpireDate);
          clientEditExpireDate = null;
          clientEditExpireDateId = null;
        "
        @keyup.escape="
          clientEditExpireDate = null;
          clientEditExpireDateId = null;
        "
      />
      <span
        v-show="clientEditExpireDateId !== client.id"
        class="inline-block"
        >{{ expiredDateFormat(client.expiresAt) }}</span
      >

      <!-- Edit -->
      <span
        v-show="clientEditExpireDateId !== client.id"
        class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        @click="
          clientEditExpireDate = client.expiresAt
            ? client.expiresAt.slice(0, 10)
            : 'yyyy-mm-dd';
          clientEditExpireDateId = client.id;
          nextTick(() => clientExpireDateInput?.select());
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
  </div>
</template>

<script setup lang="ts">
defineProps<{ client: LocalClient }>();

const globalStore = useGlobalStore();
const clientsStore = useClientsStore();
const clientEditExpireDate = ref<string | null>(null);
const clientEditExpireDateId = ref<string | null>(null);
const { t, locale } = useI18n();

const clientExpireDateInput = ref<HTMLInputElement | null>(null);

function updateClientExpireDate(
  client: LocalClient,
  expireDate: string | null
) {
  api
    .updateClientExpireDate({ clientId: client.id, expireDate })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => clientsStore.refresh().catch(console.error));
}

function expiredDateFormat(value: string | null) {
  if (value === null) return t('Permanent');
  const dateTime = new Date(value);
  return dateTime.toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>
