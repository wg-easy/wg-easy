<template>
  <div class="container mx-auto max-w-3xl px-3 md:px-0">
    <div
      class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden"
    >
      <div
        class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600"
      >
        <div class="flex-grow">
          <p class="text-2xl font-medium dark:text-neutral-200">
            {{ $t('clients') }}
          </p>
        </div>
        <div class="flex md:block md:flex-shrink-0 space-x-1">
          <ClientsRestoreConfig />
          <ClientsBackupConfig />
          <ClientsNew />
        </div>
      </div>

      <div>
        <Clients
          v-if="clientsStore.clients && clientsStore.clients.length > 0"
        />
      </div>
      <ClientsEmpty
        v-if="clientsStore.clients && clientsStore.clients.length === 0"
      />
      <div
        v-if="clientsStore.clients === null"
        class="text-gray-200 dark:text-red-300 p-5"
      >
        <svg
          class="w-5 animate-spin mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  </div>

  <!-- QR Code-->
  <div v-if="modalStore.qrcode">
    <div
      class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20"
    >
      <div class="bg-white rounded-md shadow-lg relative p-8">
        <button
          class="absolute right-4 top-4 text-gray-600 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-neutral-700"
          @click="modalStore.qrcode = null"
        >
          <svg
            class="w-8"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <img :src="modalStore.qrcode" />
      </div>
    </div>

    <!-- Create Dialog -->
    <div
      v-if="modalStore.clientCreate"
      class="fixed z-10 inset-0 overflow-y-auto"
    >
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
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
            class="absolute inset-0 bg-gray-500 dark:bg-black opacity-75 dark:opacity-50"
          />
        </div>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
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
          class="inline-block align-bottom bg-white dark:bg-neutral-700 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div
            class="bg-white dark:bg-neutral-700 px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
          >
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-800 sm:mx-0 sm:h-10 sm:w-10"
              >
                <svg
                  class="h-6 w-6 text-white"
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
              </div>
              <div
                class="flex-grow mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"
              >
                <h3
                  id="modal-headline"
                  class="text-lg leading-6 font-medium text-gray-900 dark:text-neutral-200"
                >
                  {{ $t('newClient') }}
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    <input
                      v-model.trim="modalStore.clientCreateName"
                      class="rounded p-2 border-2 dark:bg-neutral-700 dark:text-neutral-200 border-gray-100 dark:border-neutral-600 focus:border-gray-200 focus:dark:border-neutral-500 dark:placeholder:text-neutral-400 outline-none w-full"
                      type="text"
                      :placeholder="$t('name')"
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div
            class="bg-gray-50 dark:bg-neutral-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
          >
            <button
              v-if="modalStore.clientCreateName.length"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-800 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
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
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-200 dark:bg-neutral-400 text-base font-medium text-white dark:text-neutral-300 sm:ml-3 sm:w-auto sm:text-sm cursor-not-allowed"
            >
              {{ $t('create') }}
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="modalStore.clientCreate = null"
            >
              {{ $t('cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Dialog -->
    <div
      v-if="modalStore.clientDelete"
      class="fixed z-10 inset-0 overflow-y-auto"
    >
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
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
            class="absolute inset-0 bg-gray-500 dark:bg-black opacity-75 dark:opacity-50"
          />
        </div>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
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
          class="inline-block align-bottom bg-white dark:bg-neutral-700 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div
            class="bg-white dark:bg-neutral-700 px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
          >
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
              >
                <!-- Heroicon name: outline/exclamation -->
                <svg
                  class="h-6 w-6 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3
                  id="modal-headline"
                  class="text-lg leading-6 font-medium text-gray-900 dark:text-neutral-200"
                >
                  {{ $t('deleteClient') }}
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-neutral-300">
                    {{ $t('deleteDialog1') }}
                    <strong>{{ modalStore.clientDelete.name }}</strong
                    >? {{ $t('deleteDialog2') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div
            class="bg-gray-50 dark:bg-neutral-600 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
          >
            <button
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-600 text-base font-medium text-white dark:text-white hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
              @click="
                modalStore.deleteClient(modalStore.clientDelete);
                modalStore.clientDelete = null;
              "
            >
              {{ $t('deleteClient') }}
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="modalStore.clientDelete = null"
            >
              {{ $t('cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();
const globalStore = useGlobalStore();
const clientsStore = useClientsStore();
const modalStore = useModalStore();

const intervalId = ref<NodeJS.Timeout | null>(null);

onMounted(() => {
  // TODO?: replace with websocket or similar
  intervalId.value = setInterval(() => {
    clientsStore
      .refresh({
        updateCharts: globalStore.updateCharts,
      })
      .catch(console.error);
  }, 1000);

  globalStore.fetchUITrafficStats();

  globalStore.fetchChartType();

  globalStore.fetchRelease();
});

onUnmounted(() => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
});
</script>
