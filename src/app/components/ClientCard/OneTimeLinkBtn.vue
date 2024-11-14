<template>
  <button
    class="inline-block rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
    :title="$t('OneTimeLink')"
    @click="showOneTimeLink(client)"
  >
    <svg
      class="w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13.213 9.787a3.391 3.391 0 0 0-4.795 0l-3.425 3.426a3.39 3.39 0 0 0 4.795 4.794l.321-.304m-.321-4.49a3.39 3.39 0 0 0 4.795 0l3.424-3.426a3.39 3.39 0 0 0-4.794-4.795l-1.028.961"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{ client: LocalClient }>();

const clientsStore = useClientsStore();

function showOneTimeLink(client: LocalClient) {
  api
    .showOneTimeLink({ clientId: client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => clientsStore.refresh().catch(console.error));
}
</script>
