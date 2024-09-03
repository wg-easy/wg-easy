<template>
  <div v-if="modalStore.qrcode">
    <div
      class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20"
    >
      <div class="bg-white rounded-md shadow-lg relative p-8">
        <button
          class="absolute right-4 top-4 text-gray-600 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-neutral-700"
          @click="modalStore.qrcode = null"
        >
          <IconsClose class="w-8" />
        </button>
        <img :src="modalStore.qrcode" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
