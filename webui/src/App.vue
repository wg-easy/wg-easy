<template>
  <main>
    <div v-cloak class="container mx-auto max-w-3xl px-3 md:px-0 mt-4 xs:mt-6">
      <div v-if="authenticated === true">
        <Header />
        <UpdateNotification :latest-release="latestRelease" :current-release="currentRelease" />

        <div class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden">
          <div class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600">
            <div class="flex-grow">
              <p class="text-2xl font-medium dark:text-neutral-200">Clients</p>
            </div>
            <div class="flex-shrink-0">
              <ClientNewButton />
            </div>
          </div>

          <div v-if="clients && clients.length > 0">
            <!-- Client -->
            <div v-for="client in clients" :key="client.id">
              <Client :client="client" />
            </div>
          </div>
          <div v-if="clients && clients.length === 0">
            <p class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm">
              There are no clients yet.<br /><br />
              <ClientNewButton />
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

      <div v-if="authenticated === null">
        <LoadingSpinner />
      </div>
    </div>

    <Footer />
  </main>
</template>

<script setup>
import { ref, onBeforeUnmount, onBeforeMount, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import Auth from '@/components/Auth.vue';
import UpdateNotification from '@/components/UpdateNotification.vue';
import ClientNewButton from '@/components/ClientNewButton.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Footer from '@/components/Footer.vue';
import ModalQRCode from '@/components/ModalQRCode.vue';
import ModalCreateClient from '@/components/ModalCreateClient.vue';
import ModalDeleteClient from '@/components/ModalDeleteClient.vue';
import Header from '@/components/Header.vue';

import API from '@/services/api';
import Client from '@/components/Client.vue';

import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';

const i18n = useI18n();

const store = useStore();
const { authenticated, requiresPassword } = storeToRefs(store);

const { clients, clientCreateShowModal, clientToDelete, qrcode, prefersDarkScheme, uiTheme, uiChartType } =
  storeToRefs(store);

const currentRelease = ref(null);
const latestRelease = ref(null);

const refreshInterval = ref(null);

const api = new API();

const refresh = store.refresh;
const setTheme = store.setTheme;

watch(prefersDarkScheme.value, () => {
  setTheme(uiTheme.value);
});

onBeforeMount(() => {
  setTheme(uiTheme.value);

  api
    .getSession()
    .then((session) => {
      authenticated.value = session.authenticated;
      // authenticated.value = false; //debug
      requiresPassword.value = session.requiresPassword;
      refresh();
      refreshInterval.value = setInterval(refresh, 1000);
    })
    .catch((err) => {
      console.log(err.message || err.toString());
    });

  getChartType();
  getRelease();
  getLang();
});

onBeforeUnmount(() => {
  clearInterval(refreshInterval.value);
});

async function getLang() {
  const lang = await api.getLang();

  if (lang !== localStorage.getItem('lang') && i18n.availableLocales.includes(lang)) {
    localStorage.setItem('lang', lang);
    i18n.global.locale = lang;
  }
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

async function getChartType() {
  api
    .getChartType()
    .then((res) => {
      uiChartType.value = parseInt(res, 10);
      console.log(res);
      console.log(uiChartType.value);
    })
    .catch(() => {
      uiChartType.value = 0;
    });
}
</script>
