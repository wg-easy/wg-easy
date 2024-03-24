<template>
  <main>
    <div v-cloak class="container mx-auto max-w-3xl px-3 md:px-0 mt-4 xs:mt-6">
      <div v-if="authenticated === true">
        <Header />
        <UpdateNotification :latest-release="latestRelease" :current-release="currentRelease" />

        <div class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden">
          <div class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600">
            <div class="flex-grow">
              <p class="text-2xl font-medium dark:text-neutral-200">{{ $t('clients') }}</p>
            </div>
            <div class="flex-shrink-0">
              <ClientNewButton />
            </div>
          </div>

          <div v-if="clients && clients.length > 0">
            <!-- Client -->
            <div
              v-for="client in clients"
              :key="client.id"
              class="relative overflow-hidden border-b last:border-b-0 border-gray-100 dark:border-neutral-600 border-solid"
            >
              <Client :client="client" />
            </div>
          </div>
          <div v-if="clients && clients.length === 0">
            <p class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm">
              {{ $t('noClients') }}<br /><br />
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
import * as Locales from 'date-fns/locale';

import Auth from '@/components/Auth.vue';
import UpdateNotification from '@/components/UpdateNotification.vue';
import ClientNewButton from '@/components/ClientNewButton.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Footer from '@/components/Footer.vue';
import ModalQRCode from '@/components/ModalQRCode.vue';
import ModalCreateClient from '@/components/ModalCreateClient.vue';
import ModalDeleteClient from '@/components/ModalDeleteClient.vue';
import Header from '@/components/Header.vue';

import api from '@/services/apiInstance';
import Client from '@/components/Client.vue';

import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';

const i18n = useI18n({
  inheritLocale: true,
  useScope: 'global',
});

const store = useStore();

const {
  authenticated,
  requiresPassword,
  clients,
  clientCreateShowModal,
  clientToDelete,
  qrcode,
  prefersDarkScheme,
  uiTheme,
  uiChartType,
  uiTrafficStats,
  lang,
  dateFnsLocale,
} = storeToRefs(store);

const currentRelease = ref(null);
const latestRelease = ref(null);

const refreshInterval = ref(null);

const refresh = store.refresh;
const setTheme = store.setTheme;

watch(prefersDarkScheme, () => {
  setTheme(uiTheme.value);
});

onBeforeMount(() => {
  setTheme(uiTheme.value);

  api
    .getSession()
    .then((session) => {
      authenticated.value = session.authenticated;
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
  getDateFnsLocale();
  getUiTrafficStats();
});

onBeforeUnmount(() => {
  clearInterval(refreshInterval.value);
});

async function getLang() {
  try {
    const configLang = await api.getLang();

    if (i18n.availableLocales.includes(configLang)) {
      localStorage.setItem('lang', configLang);
      i18n.locale.value = configLang;
      lang.value = configLang;
    } else {
      lang.value = 'en';
      localStorage.setItem('lang', lang.value);
      console.warn(`Configured language '${configLang}' is not available. Using default locale.`);
    }
  } catch (error) {
    lang.value = 'en';
    console.error(`Failed to get lang. Using default. ${error.message}`);
  }
}

function getDateFnsLocale() {
  const localeCode = Object.keys(Locales).find((key) => key.slice(0, 2).includes(lang.value));
  dateFnsLocale.value = Locales[localeCode] ?? Locales.enUS;
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
    })
    .catch(() => {
      uiChartType.value = 0;
    });
}

async function getUiTrafficStats() {
  api
    .getUiTrafficStats()
    .then((res) => {
      uiTrafficStats.value = res;
    })
    .catch(() => {
      uiTrafficStats.value = false;
    });
}
</script>
