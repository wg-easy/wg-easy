<template>
  <p class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm">
    {{ $t('noClients') }}<br /><br />
    <button
      class="bg-red-800 hover:bg-red-700 text-white border-2 border-none py-2 px-4 rounded inline-flex items-center transition"
      @click="
        modalStore.clientCreate = true;
        modalStore.clientCreateName = '';
        modalStore.clientExpireDate = '';
      "
    >
      <IconsPlus class="w-4 mr-2" />
      <span class="text-sm">{{ $t('newClient') }}</span>
    </button>
  </p>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
