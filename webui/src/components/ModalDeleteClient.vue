<template>
  <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div class="fixed inset-0 transition-opacity" aria-hidden="true">
      <div class="absolute inset-0 bg-gray-500 dark:bg-black opacity-75 dark:opacity-50"></div>
    </div>

    <!-- This element is to trick the browser into centering the modal contents. -->
    <!-- TODO: Check if still relevant? -->
    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    <div
      class="inline-block align-bottom bg-white dark:bg-neutral-700 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div class="bg-white dark:bg-neutral-700 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div class="sm:flex sm:items-start">
          <div
            class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
          >
            <!-- Heroicon name: outline/exclamation -->
            <IconWarning />
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 id="modal-headline" class="text-lg leading-6 font-medium text-gray-900 dark:text-neutral-200">
              Delete Client
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500 dark:text-neutral-300">
                Are you sure you want to delete <strong>{{ clientToDelete.name }}</strong
                >? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-gray-50 dark:bg-neutral-600 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-600 text-base font-medium text-white dark:text-white hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
          @click="deleteClient(clientToDelete)"
        >
          Delete
        </button>
        <button
          type="button"
          class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          @click="clientToDelete = null"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';
import IconWarning from '@/components/icons/IconWarning.vue';

const store = useStore();
const { clientToDelete } = storeToRefs(store);

const deleteClient = store.deleteClient;
</script>
