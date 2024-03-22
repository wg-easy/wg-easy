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
          </div>
          <div v-if="clients && clients.length === 0">
            <p class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm">
              There are no clients yet.<br /><br />
              <button
                class="bg-red-800 hover:bg-red-700 text-white border-2 border-none py-2 px-4 rounded inline-flex items-center transition"
                @click="handleNewClient()"
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

        <!-- QR Code-->
        <div v-if="qrcode">
          <ModalQRCode />
        </div>

        <!-- Create Dialog -->
        <div v-if="clientCreateShowModal" class="fixed z-10 inset-0 overflow-y-auto">
          <ModalCreateClient />
        </div>

        <!-- Delete Dialog -->
        <div v-if="clientToDelete" class="fixed z-10 inset-0 overflow-y-auto">
          <ModalDeleteClient />
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import sha256 from 'crypto-js/sha256';

import Auth from '@/components/Auth.vue';
import UpdateNotification from '@/components/UpdateNotification.vue';
import ClientNewButton from '@/components/ClientNewButton.vue';
import IconLogout from '@/components/icons/IconLogout.vue';
import IconNew from '@/components/icons/IconNew.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Footer from '@/components/Footer.vue';
import ModalQRCode from '@/components/ModalQRCode.vue';
import ModalCreateClient from '@/components/ModalCreateClient.vue';
import ModalDeleteClient from '@/components/ModalDeleteClient.vue';

import API from '@/services/api';
import Client from '@/components/Client.vue';

import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const { authenticated, requiresPassword } = storeToRefs(store);

const { clients, clientsPersist, clientCreateShowModal, clientToDelete, clientCreateName, qrcode } = storeToRefs(store);

const logout = store.logout;

const currentRelease = ref(null);
const latestRelease = ref(null);

const refreshInterval = ref(null);

const api = new API();

onMounted(() => {
  api
    .getSession()
    .then((session) => {
      authenticated.value = session.authenticated;
      // authenticated.value = false; //debug
      requiresPassword.value = session.requiresPassword;

      refreshInterval.value = setInterval(refresh, 1000);
    })
    .catch((err) => {
      console.log(err.message || err.toString());
    });
});

onBeforeUnmount(() => {
  clearInterval(refreshInterval.value);
});

getRelease();

function handleNewClient() {
  clientCreateShowModal.value = true;
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

  try {
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
      updateCharts = true; // DEV TODO: Update. Get from settings

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
  } catch (error) {
    console.log('Something went wrong', error);
  }
}
</script>
