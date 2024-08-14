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
        <IconsLoading class="w-5 animate-spin mx-auto" />
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
          <IconsClose class="w-8" />
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
                <IconsPlus class="h-6 w-6 text-white" />
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
                <IconsWarning class="h-6 w-6 text-red-600" />
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

watchEffect(() => {
  console.log(modalStore.clientDelete, modalStore.clientDelete ? true : false);
});

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
