<template>
  <button
    class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 max-md:border-l-0 border-2 border-gray-100 dark:border-neutral-600 py-2 px-4 rounded-r-full md:rounded inline-flex items-center transition"
    @click="
      modalStore.clientCreate = true;
      modalStore.clientCreateName = '';
    "
  >
    <svg
      class="w-4 md:mr-2"
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
    <span class="max-md:hidden text-sm">{{ $t('new') }}</span>
  </button>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
