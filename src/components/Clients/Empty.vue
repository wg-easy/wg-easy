<template>
  <p class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm">
    {{ $t('noClients') }}<br /><br />
    <button
      class="bg-red-800 hover:bg-red-700 text-white border-2 border-none py-2 px-4 rounded inline-flex items-center transition"
      @click="
        modalStore.clientCreate = true;
        modalStore.clientCreateName = '';
      "
    >
      <svg
        class="w-4 mr-2"
        inline
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      <span class="text-sm">{{ $t('newClient') }}</span>
    </button>
  </p>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
