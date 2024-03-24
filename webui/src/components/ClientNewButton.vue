<!-- ClientNewButton.vue -->
<template>
  <div>
    <button
      class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-600 py-2 px-4 rounded inline-flex items-center transition"
      @click="handleNewClient()"
    >
      <IconNew class="w-4 mr-2" />
      <span class="text-sm">{{ $t('new') }}</span>
    </button>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useStore } from '@/store/store';
import IconNew from './icons/IconNew.vue';

const store = useStore();
const { clientCreateShowModal, clientCreateName } = storeToRefs(store);

const handleNewClient = () => {
  clientCreateShowModal.value = true;
  clientCreateName.value = '';
};
</script>
