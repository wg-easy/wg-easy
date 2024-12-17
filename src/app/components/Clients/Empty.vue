<template>
  <p class="m-10 text-center text-sm text-gray-400 dark:text-neutral-400">
    {{ $t('noClients') }}<br /><br />
    <button
      class="inline-flex items-center rounded border-2 border-none bg-red-800 px-4 py-2 text-white transition hover:bg-red-700"
      @click="
        modalStore.clientCreate = true;
        modalStore.clientCreateName = '';
        modalStore.clientExpireDate = '';
      "
    >
      <IconsPlus class="mr-2 w-4" />
      <span class="text-sm">{{ $t('newClient') }}</span>
    </button>
  </p>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
