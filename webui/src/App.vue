<template>
  <main>
    <div v-cloak class="container mx-auto max-w-3xl px-5 md:px-0">
      <div v-if="authenticated === true">
        <span
          v-if="requiresPassword"
          class="text-sm text-gray-400 dark:text-neutral-400 mb-10 mr-2 mt-3 cursor-pointer hover:underline float-right"
          @click="logout"
        >
          Logout
          <IconLogout />
        </span>
        <h1 class="text-4xl dark:text-neutral-200 font-medium mt-2 mb-2">
          <img src="./assets/img/logo.png" width="32" class="inline align-middle dark:bg" />
          <span class="align-middle">WireGuard</span>
        </h1>
        <h2 class="text-sm text-gray-400 dark:text-neutral-400 mb-10"></h2>

        <UpdateNotification :latest-release="latestRelease" :current-release="currentRelease" />

        <div class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden">
          <ClientNewButton @create-new-client="handleNewClient" />

          <div v-if="clients && clients.length > 0">
            <!-- Client -->
            <div v-for="client in clients" :key="client.id">
              <Client :client="client" />
            </div>
            <div v-if="clients && clients.length === 0">
              <p class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm">
                There are no clients yet.<br /><br />
                <button
                  class="bg-red-800 hover:bg-red-700 text-white border-2 border-none py-2 px-4 rounded inline-flex items-center transition"
                  @click="
                    clientCreate = true;
                    clientCreateName = '';
                  "
                >
                  <IconNew class="w-4 mr-2" />
                  <span class="text-sm">New Client</span>
                </button>
              </p>
            </div>
            <div v-if="clients === null" class="text-gray-200 dark:text-red-300 p-5">
              <LoadingSpinner />
            </div>
          </div>
        </div>

        <!-- QR Code-->
        <div v-if="qrcode">
          <div class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20">
            <div class="bg-white rounded-md shadow-lg relative p-8">
              <button
                class="absolute right-4 top-4 text-gray-600 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-neutral-700"
                @click="qrcode = null"
              >
                <IconClose />
              </button>
              <img :src="qrcode" />
            </div>
          </div>
        </div>

        <!-- Create Dialog -->
        <div v-if="clientCreate" class="fixed z-10 inset-0 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
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
              <div class="absolute inset-0 bg-gray-500 dark:bg-black opacity-75 dark:opacity-50"></div>
            </div>

            <!-- This element is to trick the browser into centering the modal contents. -->
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
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
              <div class="bg-white dark:bg-neutral-700 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                  <div
                    class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-800 sm:mx-0 sm:h-10 sm:w-10"
                  >
                    <IconNew class="h-6 w-6 text-white" />
                  </div>
                  <div class="flex-grow mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 id="modal-headline" class="text-lg leading-6 font-medium text-gray-900 dark:text-neutral-200">
                      New Client
                    </h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">
                        <input
                          v-model.trim="clientCreateName"
                          class="rounded p-2 border-2 dark:bg-neutral-700 dark:text-neutral-200 border-gray-100 dark:border-neutral-600 focus:border-gray-200 focus:dark:border-neutral-500 dark:placeholder:text-neutral-400 outline-none w-full"
                          type="text"
                          placeholder="Name"
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 dark:bg-neutral-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  v-if="clientCreateName.length"
                  type="button"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-800 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  @click="
                    createClient();
                    clientCreate = null;
                  "
                >
                  Create
                </button>
                <button
                  v-else
                  type="button"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-200 dark:bg-neutral-400 text-base font-medium text-white dark:text-neutral-300 sm:ml-3 sm:w-auto sm:text-sm cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  type="button"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  @click="clientCreate = null"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Delete Dialog -->
        <div v-if="clientDelete" class="fixed z-10 inset-0 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
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
              <div class="absolute inset-0 bg-gray-500 dark:bg-black opacity-75 dark:opacity-50"></div>
            </div>

            <!-- This element is to trick the browser into centering the modal contents. -->
            <!-- TODO: Check if still relevant? -->
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
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
                        Are you sure you want to delete <strong>{{ clientDelete.name }}</strong
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
                  @click="
                    deleteClient(clientDelete);
                    clientDelete = null;
                  "
                >
                  Delete
                </button>
                <button
                  type="button"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  @click="clientDelete = null"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="authenticated === false">
        <Auth />
      </div>

      <div v-if="authenticated === null" class="text-gray-300 dark:text-red-300 pt-24 pb-12">
        <LoadingSpinner />
      </div>
    </div>

    <Footer />
  </main>
</template>

<script setup>
import { ref, reactive } from 'vue';
import sha256 from 'crypto-js/sha256';

import Auth from '@/components/Auth.vue';
import UpdateNotification from '@/components/UpdateNotification.vue';
import ClientNewButton from '@/components/ClientNewButton.vue';
import IconLogout from '@/components/icons/IconLogout.vue';
import IconNew from '@/components/icons/IconNew.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import IconClose from '@/components/icons/IconClose.vue';
import IconWarning from '@/components/icons/IconWarning.vue';
import Footer from '@/components/Footer.vue';

import API from '@/services/api';
import Client from '@/components/Client.vue';

const authenticated = ref(null);
const authenticating = ref(false);
const password = ref(null);
const requiresPassword = ref(null);

const clients = ref(null);
const clientsPersist = reactive({});
const clientDelete = ref(null);
const clientCreate = ref(null);
const clientCreateName = ref('');
const qrcode = ref(null);

const currentRelease = ref(null);
const latestRelease = ref(null);

const isDark = ref(null);

const api = new API();

isDark.value = false;
if (localStorage.theme === 'dark') {
  isDark.value = true;
}

api
  .getSession()
  .then((session) => {
    authenticated.value = session.authenticated;
    // authenticated.value = false; //debug
    requiresPassword.value = session.requiresPassword;
    refresh({
      updateCharts: true,
    }).catch((err) => {
      console.log(err.message || err.toString());
    });
  })
  .catch((err) => {
    console.log(err.message || err.toString());
  });

setInterval(() => {
  refresh({
    updateCharts: true,
  }).catch(console.error);
}, 1000);

getRelease();

function handleNewClient() {
  clientCreate.value = true;
  clientCreateName.value = '';
}

async function getRelease() {
  try {
    const currentReleaseData = await api.getRelease();
    const latestReleaseData = await fetch('https://wg-easy.github.io/wg-easy/changelog.json')
      .then((res) => res.json())
      .then((releases) => {
        const releasesArray = Object.entries(releases).map(([version, changelog]) => ({
          version: parseInt(version, 10),
          changelog,
        }));
        releasesArray.sort((a, b) => {
          return b.version - a.version;
        });

        return releasesArray[0];
      });

    console.log(`Current Release: ${currentReleaseData}`);
    console.log(`Latest Release: ${latestReleaseData.version}`);

    if (currentReleaseData >= latestReleaseData.version) return;

    currentRelease.value = currentReleaseData;
    latestRelease.value = latestReleaseData;
  } catch (error) {
    console.log('Something went wrong', error);
  }
}

async function refresh({ updateCharts = false } = {}) {
  if (!authenticated.value) return;

  const clientsData = await api.getClients();
  clients.value = clientsData.map((client) => {
    if (client.name.includes('@') && client.name.includes('.')) {
      client.avatar = `https://www.gravatar.com/avatar/${sha256(client.name)}?d=blank`;
    }

    if (!clientsPersist[client.id]) {
      clientsPersist[client.id] = {};
      clientsPersist[client.id].transferRxHistory = Array(50).fill(0);
      clientsPersist[client.id].transferRxPrevious = client.transferRx;
      clientsPersist[client.id].transferTxHistory = Array(50).fill(0);
      clientsPersist[client.id].transferTxPrevious = client.transferTx;
    }

    // Debug
    client.transferRx = clientsPersist[client.id].transferRxPrevious + Math.random() * 1000;
    client.transferTx = clientsPersist[client.id].transferTxPrevious + Math.random() * 1000;
    client.latestHandshakeAt = new Date('2024-03-20');
    // updateCharts = false;

    if (updateCharts) {
      clientsPersist[client.id].transferRxCurrent = client.transferRx - clientsPersist[client.id].transferRxPrevious;
      clientsPersist[client.id].transferRxPrevious = client.transferRx;
      clientsPersist[client.id].transferTxCurrent = client.transferTx - clientsPersist[client.id].transferTxPrevious;
      clientsPersist[client.id].transferTxPrevious = client.transferTx;

      clientsPersist[client.id].transferRxHistory.push(clientsPersist[client.id].transferRxCurrent);
      clientsPersist[client.id].transferRxHistory.shift();

      clientsPersist[client.id].transferTxHistory.push(clientsPersist[client.id].transferTxCurrent);
      clientsPersist[client.id].transferTxHistory.shift();
    }

    client.transferTxCurrent = clientsPersist[client.id].transferTxCurrent;
    client.transferRxCurrent = clientsPersist[client.id].transferRxCurrent;

    client.transferTxHistory = clientsPersist[client.id].transferTxHistory;
    client.transferRxHistory = clientsPersist[client.id].transferRxHistory;
    client.transferMax = Math.max(...client.transferTxHistory, ...client.transferRxHistory);

    client.hoverTx = clientsPersist[client.id].hoverTx;
    client.hoverRx = clientsPersist[client.id].hoverRx;

    return client;
  });
}

function login(e) {
  e.preventDefault();

  if (!password.value) return;
  if (authenticating.value) return;

  authenticating.value = true;
  api
    .createSession({
      password: password,
    })
    .then(async () => {
      const session = await api.getSession();
      authenticated.value = session.authenticated;
      requiresPassword.value = session.requiresPassword;
      return this.refresh();
    })
    .catch((err) => {
      alert(err.message || err.toString());
    })
    .finally(() => {
      this.authenticating = false;
      this.password = null;
    });
}

function logout(e) {
  e.preventDefault();

  api
    .deleteSession()
    .then(() => {
      authenticated.value = false;
      clients.value = null;
    })
    .catch((err) => {
      alert(err.message || err.toString());
    });
}

function createClient() {
  const name = clientCreateName;
  if (!name.value) return;

  api
    .createClient({ name })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}

function deleteClient(client) {
  api
    .deleteClient({ clientId: client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}

function toggleTheme() {
  if (isDark.value) {
    localStorage.theme = 'light';
    document.documentElement.classList.remove('dark');
  } else {
    localStorage.theme = 'dark';
    document.documentElement.classList.add('dark');
  }
  isDark.value = !isDark.value;
}
</script>
