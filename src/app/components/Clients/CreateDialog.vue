<template>
  <!-- Create Dialog -->
  <div
    v-if="modalStore.clientCreate"
    class="fixed inset-0 z-10 overflow-y-auto"
  >
    <div
      class="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0"
    >
      <!--
        Background overlay, show/hide based on modal state.

        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div
          class="absolute inset-0 bg-gray-500 opacity-75 dark:bg-black dark:opacity-50"
        />
      </div>

      <!-- This element is to trick the browser into centering the modal contents. -->
      <span
        class="hidden sm:inline-block sm:h-screen sm:align-middle"
        aria-hidden="true"
        >&#8203;</span
      >
      <!--
        Modal panel, show/hide based on modal state.

        Entering: "ease-out duration-300"
          From: "opacity-0 tranneutral-y-4 sm:tranneutral-y-0 sm:scale-95"
          To: "opacity-100 tranneutral-y-0 sm:scale-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100 tranneutral-y-0 sm:scale-100"
          To: "opacity-0 tranneutral-y-4 sm:tranneutral-y-0 sm:scale-95"
      -->
      <div
        class="inline-block w-full transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-lg sm:align-middle dark:bg-neutral-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 dark:bg-neutral-700">
          <div class="sm:flex sm:items-start">
            <div
              class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-800 sm:mx-0 sm:h-10 sm:w-10"
            >
              <IconsPlus class="h-6 w-6 text-white" />
            </div>
            <div
              class="mt-3 flex-grow text-center sm:ml-4 sm:mt-0 sm:text-left"
            >
              <h3
                id="modal-headline"
                class="text-lg font-medium leading-6 text-gray-900 dark:text-neutral-200"
              >
                {{ $t('newClient') }}
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  <input
                    v-model.trim="modalStore.clientCreateName"
                    class="w-full rounded border-2 border-gray-100 p-2 outline-none focus:border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400 focus:dark:border-neutral-500"
                    type="text"
                    :placeholder="$t('name')"
                  />
                </p>
              </div>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  <label
                    class="mb-2 block text-sm font-bold text-gray-900 dark:text-neutral-200"
                    for="expireDate"
                  >
                    {{ $t('ExpireDate') }}
                  </label>
                  <input
                    v-model.trim="modalStore.clientExpireDate"
                    class="w-full rounded border-2 border-gray-100 p-2 outline-none focus:border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400 focus:dark:border-neutral-500"
                    type="date"
                    :placeholder="$t('ExpireDate')"
                    name="expireDate"
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-neutral-700"
        >
          <button
            v-if="modalStore.clientCreateName.length"
            type="button"
            class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            @click="
              modalStore.createClient();
              modalStore.clientCreate = null;
            "
          >
            {{ $t('create') }}
          </button>
          <button
            v-else
            type="button"
            class="inline-flex w-full cursor-not-allowed justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-base font-medium text-white shadow-sm sm:ml-3 sm:w-auto sm:text-sm dark:bg-neutral-400 dark:text-neutral-300"
          >
            {{ $t('create') }}
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm dark:border-neutral-500 dark:bg-neutral-500 dark:text-neutral-50 dark:hover:border-neutral-600 dark:hover:bg-neutral-600"
            @click="modalStore.clientCreate = null"
          >
            {{ $t('cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const modalStore = useModalStore();
</script>
