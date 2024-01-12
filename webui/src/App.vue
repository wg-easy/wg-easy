<script>
import { ref, reactive } from 'vue';
import sha256 from 'crypto-js/sha256';

import { useDateTime } from './composables/useDateTime';
import { useTimeAgo } from './composables/useTimeAgo';
import { useBytes } from './composables/useBytes';

import UpdateNotification from './components/UpdateNotification.vue';
import ClientNewButton from './components/ClientNewButton.vue';
import ClientName from './components/ClientName.vue';
import ClientAvatar from './components/ClientAvatar.vue';
import ClientAddress from './components/ClientAddress.vue';
import IconUpArrow from './components/icons/IconUpArrow.vue';
import IconDownArrow from './components/icons/IconDownArrow.vue';
import IconLogout from './components/icons/IconLogout.vue';
import IconQRCode from './components/icons/IconQRCode.vue';
import IconDownload from './components/icons/IconDownload.vue';
import IconDelete from './components/icons/IconDelete.vue';
import IconNew from './components/icons/IconNew.vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import IconClose from './components/icons/IconClose.vue';
import IconWarning from './components/icons/IconWarning.vue';
import IconAvatarDefault from './components/icons/IconAvatarDefault.vue';
import ClientTransfer from './components/ClientTransfer.vue';
import VueApexCharts from 'vue3-apexcharts';

class API {
  async call({ method, path, body }) {
    const res = await fetch(`./api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) {
      return undefined;
    }

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || res.statusText);
    }

    return json;
  }

  async getRelease() {
    return this.call({
      method: 'get',
      path: '/release',
    });
  }

  async getSession() {
    return this.call({
      method: 'get',
      path: '/session',
    });
  }

  async createSession({ password }) {
    return this.call({
      method: 'post',
      path: '/session',
      body: { password },
    });
  }

  async deleteSession() {
    return this.call({
      method: 'delete',
      path: '/session',
    });
  }

  async getClients() {
    return this.call({
      method: 'get',
      path: '/wireguard/client',
    }).then((clients) =>
      clients.map((client) => ({
        ...client,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt),
        latestHandshakeAt:
          client.latestHandshakeAt !== null
            ? new Date(client.latestHandshakeAt)
            : null,
      }))
    );
  }

  async createClient({ name }) {
    return this.call({
      method: 'post',
      path: '/wireguard/client',
      body: { name },
    });
  }

  async deleteClient({ clientId }) {
    return this.call({
      method: 'delete',
      path: `/wireguard/client/${clientId}`,
    });
  }

  async enableClient({ clientId }) {
    return this.call({
      method: 'post',
      path: `/wireguard/client/${clientId}/enable`,
    });
  }

  async disableClient({ clientId }) {
    return this.call({
      method: 'post',
      path: `/wireguard/client/${clientId}/disable`,
    });
  }

  async updateClientName({ clientId, name }) {
    return this.call({
      method: 'put',
      path: `/wireguard/client/${clientId}/name/`,
      body: { name },
    });
  }

  async updateClientAddress({ clientId, address }) {
    return this.call({
      method: 'put',
      path: `/wireguard/client/${clientId}/address/`,
      body: { address },
    });
  }
}

export default {
  setup() {
    const authenticated = ref(null);
    const authenticating = ref(false);
    const password = ref(null);
    const requiresPassword = ref(null);

    const clients = ref(null);
    const clientsPersist = reactive({});
    const clientDelete = ref(null);
    const clientCreate = ref(null);
    const clientCreateName = ref('');
    const clientEditName = ref(null);
    const clientEditNameId = ref(null);
    const clientEditAddress = ref(null);
    const clientEditAddressId = ref(null);
    const qrcode = ref(null);

    const currentRelease = ref(null);
    const latestRelease = ref(null);

    const isDark = ref(null);

    const chartOptions = reactive({
      chart: {
        background: 'transparent',
        type: 'bar',
        stacked: false,
        toolbar: {
          show: false,
        },
        animations: {
          enabled: false,
        },
      },
      colors: [
        '#DDDDDD', // rx
        '#EEEEEE', // tx
      ],
      dataLabels: {
        enabled: false,
      },
      plotOptions: {
        bar: {
          horizontal: false,
        },
      },
      xaxis: {
        labels: {
          show: false,
        },
        axisTicks: {
          show: true,
        },
        axisBorder: {
          show: true,
        },
      },
      yaxis: {
        labels: {
          show: false,
        },
        min: 0,
      },
      tooltip: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      grid: {
        show: false,
        padding: {
          left: -10,
          right: 0,
          bottom: -15,
          top: -15,
        },
        column: {
          opacity: 0,
        },
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
    });

    const api = new API();

    const { dateTime } = useDateTime();
    const { timeago } = useTimeAgo();
    const { bytes } = useBytes();

    return {
      authenticated,
      authenticating,
      password,
      requiresPassword,

      clients,
      clientsPersist,
      clientDelete,
      clientCreate,
      clientCreateName,
      clientEditName,
      clientEditNameId,
      clientEditAddress,
      clientEditAddressId,
      qrcode,

      currentRelease,
      latestRelease,

      isDark,

      chartOptions,

      dateTime,
      timeago,
      bytes,

      api,
    };
  },
  mounted() {
    this.isDark = false;
    if (localStorage.theme === 'dark') {
      this.isDark = true;
    }

    this.api
      .getSession()
      .then((session) => {
        console.log(session);
        this.authenticated = session.authenticated;
        this.requiresPassword = session.requiresPassword;
        this.refresh({
          updateCharts: true,
        }).catch((err) => {
          alert(err.message || err.toString());
        });
      })
      .catch((err) => {
        alert(err.message || err.toString());
      });

    setInterval(() => {
      this.refresh({
        updateCharts: true,
      }).catch(console.error);
    }, 1000);

    Promise.resolve()
      .then(async () => {
        const currentReleaseData = await this.api.getRelease();
        const latestReleaseData = await fetch(
          'https://wg-easy.github.io/wg-easy/changelog.json'
        )
          .then((res) => res.json())
          .then((releases) => {
            const releasesArray = Object.entries(releases).map(
              ([version, changelog]) => ({
                version: parseInt(version, 10),
                changelog,
              })
            );
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
      })
      .catch(console.error);
  },
  components: {
    UpdateNotification,
    ClientNewButton,
    ClientName,
    ClientAvatar,
    ClientAddress,
    IconUpArrow,
    IconDownArrow,
    IconLogout,
    IconQRCode,
    IconDownload,
    IconDelete,
    IconNew,
    LoadingSpinner,
    IconClose,
    IconWarning,
    IconAvatarDefault,
    ClientTransfer,
    apexchart: VueApexCharts,
  },
  methods: {
    handleNewClient() {
      this.clientCreate = true;
      this.clientCreateName = '';
    },

    async refresh({ updateCharts = false } = {}) {
      if (!this.authenticated) return;

      const clientsData = await this.api.getClients();
      this.clients = clientsData.map((client) => {
        if (client.name.includes('@') && client.name.includes('.')) {
          client.avatar = `https://www.gravatar.com/avatar/${sha256(
            client.name
          )}?d=blank`;
        }

        if (!this.clientsPersist[client.id]) {
          this.clientsPersist[client.id] = {};
          this.clientsPersist[client.id].transferRxHistory = Array(50).fill(0);
          this.clientsPersist[client.id].transferRxPrevious = client.transferRx;
          this.clientsPersist[client.id].transferTxHistory = Array(50).fill(0);
          this.clientsPersist[client.id].transferTxPrevious = client.transferTx;
        }

        // Debug
        // client.transferRx = this.clientsPersist[client.id].transferRxPrevious + Math.random() * 1000;
        // client.transferTx = this.clientsPersist[client.id].transferTxPrevious + Math.random() * 1000;

        if (updateCharts) {
          this.clientsPersist[client.id].transferRxCurrent =
            client.transferRx -
            this.clientsPersist[client.id].transferRxPrevious;
          this.clientsPersist[client.id].transferRxPrevious = client.transferRx;
          this.clientsPersist[client.id].transferTxCurrent =
            client.transferTx -
            this.clientsPersist[client.id].transferTxPrevious;
          this.clientsPersist[client.id].transferTxPrevious = client.transferTx;

          this.clientsPersist[client.id].transferRxHistory.push(
            this.clientsPersist[client.id].transferRxCurrent
          );
          this.clientsPersist[client.id].transferRxHistory.shift();

          this.clientsPersist[client.id].transferTxHistory.push(
            this.clientsPersist[client.id].transferTxCurrent
          );
          this.clientsPersist[client.id].transferTxHistory.shift();
        }

        client.transferTxCurrent =
          this.clientsPersist[client.id].transferTxCurrent;
        client.transferRxCurrent =
          this.clientsPersist[client.id].transferRxCurrent;

        client.transferTxHistory =
          this.clientsPersist[client.id].transferTxHistory;
        client.transferRxHistory =
          this.clientsPersist[client.id].transferRxHistory;
        client.transferMax = Math.max(
          ...client.transferTxHistory,
          ...client.transferRxHistory
        );

        client.hoverTx = this.clientsPersist[client.id].hoverTx;
        client.hoverRx = this.clientsPersist[client.id].hoverRx;

        return client;
      });
    },

    login(e) {
      e.preventDefault();

      if (!this.password) return;
      if (this.authenticating) return;

      this.authenticating = true;
      this.api
        .createSession({
          password: this.password,
        })
        .then(async () => {
          const session = await this.api.getSession();
          this.authenticated = session.authenticated;
          this.requiresPassword = session.requiresPassword;
          return this.refresh();
        })
        .catch((err) => {
          alert(err.message || err.toString());
        })
        .finally(() => {
          this.authenticating = false;
          this.password = null;
        });
    },

    logout(e) {
      e.preventDefault();

      this.api
        .deleteSession()
        .then(() => {
          this.authenticated = false;
          this.clients = null;
        })
        .catch((err) => {
          alert(err.message || err.toString());
        });
    },

    createClient() {
      const name = this.clientCreateName;
      if (!name) return;

      this.api
        .createClient({ name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },

    deleteClient(client) {
      this.api
        .deleteClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },

    enableClient(client) {
      this.api
        .enableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },

    disableClient(client) {
      this.api
        .disableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },

    updateClientName(client, name) {
      this.api
        .updateClientName({ clientId: client.id, name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },

    updateClientAddress(client, address) {
      this.api
        .updateClientAddress({ clientId: client.id, address })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => this.refresh().catch(console.error));
    },

    toggleTheme() {
      if (this.isDark) {
        localStorage.theme = 'light';
        document.documentElement.classList.remove('dark');
      } else {
        localStorage.theme = 'dark';
        document.documentElement.classList.add('dark');
      }
      this.isDark = !this.isDark;
    },
  },
};
</script>

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
          <img
            src="./assets/img/logo.png"
            width="32"
            class="inline align-middle dark:bg"
          />
          <span class="align-middle">WireGuard</span>
        </h1>
        <h2 class="text-sm text-gray-400 dark:text-neutral-400 mb-10"></h2>

        <UpdateNotification
          :latestRelease="latestRelease"
          :currentRelease="currentRelease"
        />

        <div
          class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden"
        >
          <ClientNewButton @create-new-client="handleNewClient" />

          <div>
            <!-- Client -->
            <div
              v-if="clients && clients.length > 0"
              v-for="client in clients"
              :key="client.id"
              class="relative overflow-hidden border-b last:border-b-0 border-gray-100 dark:border-neutral-600 border-solid"
            >
              <!-- Chart -->
              <!-- TODO: Individual bars are too wide -->
              <div
                class="absolute z-0 bottom-0 left-0 right-0"
                style="top: 60%"
              >
                <apexchart
                  width="100%"
                  height="100%"
                  type="bar"
                  :options="chartOptions"
                  :series="[
                    {
                      name: 'Upload (TX)',
                      data: client.transferTxHistory,
                    },
                  ]"
                />
              </div>
              <div
                class="absolute z-0 top-0 left-0 right-0"
                style="bottom: 60%"
              >
                <apexchart
                  width="100%"
                  height="100%"
                  type="bar"
                  :options="chartOptions"
                  :series="[
                    {
                      name: 'Download (RX)',
                      data: client.transferRxHistory,
                    },
                  ]"
                  style="transform: scaleY(-1)"
                >
                </apexchart>
              </div>

              <div
                class="relative p-5 z-10 flex flex-col md:flex-row justify-between"
              >
                <div class="flex items-center pb-2 md:pb-0">
                  <ClientAvatar :client="client" />

                  <div class="flex-grow">
                    <!-- Name -->
                    <ClientName
                      :client="client"
                      :clientEditName="clientEditName"
                      :clientEditNameId="clientEditNameId"
                      @update-client-name="updateClientName"
                    />

                    <!-- Info -->
                    <div class="text-gray-400 dark:text-neutral-400 text-xs">
                      <!-- Address -->
                      <ClientAddress
                        :client="client"
                        @update-address="updateClientAddress"
                      />

                      <!-- Transfer TX -->
                      <ClientTransfer
                        :transferData="client.transferTx"
                        :transferDataCurrent="client.transferTxCurrent"
                        :title="'Total Download: ' + bytes(client.transferTx)"
                      >
                        <IconDownArrow />
                      </ClientTransfer>

                      <!-- Transfer RX -->
                      <ClientTransfer
                        :transferData="client.transferRx"
                        :transferDataCurrent="client.transferRxCurrent"
                        :title="'Total Upload: ' + bytes(client.transferRx)"
                      >
                        <IconUpArrow />
                      </ClientTransfer>

                      <!-- Last seen -->
                      <span
                        v-if="client.latestHandshakeAt"
                        :title="
                          'Last seen on ' +
                          dateTime(new Date(client.latestHandshakeAt))
                        "
                      >
                        <!-- FIXME: add "timeago" -->
                        <!-- · {{ new Date(client.latestHandshakeAt) | timeago }} -->
                        · {{ timeago(client.latestHandshakeAt) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-end">
                  <div
                    class="text-gray-400 dark:text-neutral-400 flex gap-1 items-center justify-between"
                  >
                    <!-- Enable/Disable -->
                    <div
                      @click="disableClient(client)"
                      v-if="client.enabled === true"
                      title="Disable Client"
                      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700 transition-all"
                    >
                      <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white"></div>
                    </div>
                    <div
                      @click="enableClient(client)"
                      v-if="client.enabled === false"
                      title="Enable Client"
                      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 dark:bg-neutral-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-neutral-500 transition-all"
                    >
                      <div class="rounded-full w-4 h-4 m-1 bg-white"></div>
                    </div>

                    <!-- Show QR-->
                    <button
                      class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white p-2 rounded transition"
                      title="Show QR Code"
                      @click="
                        qrcode = `./api/wireguard/client/${client.id}/qrcode.svg`
                      "
                    >
                      <IconQRCode />
                    </button>

                    <!-- Download Config -->
                    <a
                      :href="
                        './api/wireguard/client/' + client.id + '/configuration'
                      "
                      download
                      class="align-middle inline-block bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white p-2 rounded transition"
                      title="Download Configuration"
                    >
                      <IconDownload />
                    </a>

                    <!-- Delete -->
                    <button
                      class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white p-2 rounded transition"
                      title="Delete Client"
                      @click="clientDelete = client"
                    >
                      <IconDelete />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="clients && clients.length === 0">
              <p
                class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm"
              >
                There are no clients yet.<br /><br />
                <button
                  @click="
                    clientCreate = true;
                    clientCreateName = '';
                  "
                  class="bg-red-800 hover:bg-red-700 text-white border-2 border-none py-2 px-4 rounded inline-flex items-center transition"
                >
                  <IconNew class="w-4 mr-2" />
                  <span class="text-sm">New Client</span>
                </button>
              </p>
            </div>
            <div
              v-if="clients === null"
              class="text-gray-200 dark:text-red-300 p-5"
            >
              <LoadingSpinner />
            </div>
          </div>
        </div>

        <!-- QR Code-->
        <div v-if="qrcode">
          <div
            class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20"
          >
            <div class="bg-white rounded-md shadow-lg relative p-8">
              <button
                @click="qrcode = null"
                class="absolute right-4 top-4 text-gray-600 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-neutral-700"
              >
                <IconClose />
              </button>
              <img :src="qrcode" />
            </div>
          </div>
        </div>

        <!-- Create Dialog -->
        <div v-if="clientCreate" class="fixed z-10 inset-0 overflow-y-auto">
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
              ></div>
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
                    <IconNew class="h-6 w-6 text-white" />
                  </div>
                  <div
                    class="flex-grow mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"
                  >
                    <h3
                      class="text-lg leading-6 font-medium text-gray-900 dark:text-neutral-200"
                      id="modal-headline"
                    >
                      New Client
                    </h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">
                        <input
                          class="rounded p-2 border-2 dark:bg-neutral-700 dark:text-neutral-200 border-gray-100 dark:border-neutral-600 focus:border-gray-200 focus:dark:border-neutral-500 dark:placeholder:text-neutral-400 outline-none w-full"
                          type="text"
                          v-model.trim="clientCreateName"
                          placeholder="Name"
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
                  v-if="clientCreateName.length"
                  type="button"
                  @click="
                    createClient();
                    clientCreate = null;
                  "
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-800 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
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
                  @click="clientCreate = null"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Delete Dialog -->
        <div v-if="clientDelete" class="fixed z-10 inset-0 overflow-y-auto">
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
              ></div>
            </div>

            <!-- This element is to trick the browser into centering the modal contents. -->
            <!-- TODO: Check if still relevant? -->
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
                    <IconWarning />
                  </div>
                  <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3
                      class="text-lg leading-6 font-medium text-gray-900 dark:text-neutral-200"
                      id="modal-headline"
                    >
                      Delete Client
                    </h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500 dark:text-neutral-300">
                        Are you sure you want to delete
                        <strong>{{ clientDelete.name }}</strong
                        >? This action cannot be undone.
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
                  @click="
                    deleteClient(clientDelete);
                    clientDelete = null;
                  "
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-600 text-base font-medium text-white dark:text-white hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  @click="clientDelete = null"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="authenticated === false">
        <h1
          class="text-4xl font-medium my-16 text-gray-700 dark:text-neutral-200 text-center"
        >
          WireGuard
        </h1>

        <form
          @submit="login"
          class="shadow rounded-md bg-white dark:bg-neutral-700 mx-auto w-64 p-5 overflow-hidden mt-10"
        >
          <!-- Avatar -->
          <div
            class="h-20 w-20 mb-10 mt-5 mx-auto rounded-full bg-red-800 dark:bg-red-800 relative overflow-hidden"
          >
            <IconAvatarDefault
              class="w-10 h-10 m-5 text-white dark:text-white"
            />
          </div>

          <input
            type="password"
            name="password"
            placeholder="Password"
            v-model="password"
            class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
          />

          <button
            v-if="authenticating"
            class="bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed"
          >
            <LoadingSpinner />
          </button>
          <input
            v-if="!authenticating && password"
            type="submit"
            class="bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer"
            value="Sign In"
          />
          <input
            v-if="!authenticating && !password"
            type="submit"
            class="bg-gray-200 dark:bg-neutral-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed"
            value="Sign In"
          />
        </form>
      </div>

      <div
        v-if="authenticated === null"
        class="text-gray-300 dark:text-red-300 pt-24 pb-12"
      >
        <LoadingSpinner />
      </div>
    </div>

    <p
      v-cloak
      class="text-center m-10 text-gray-300 dark:text-neutral-600 text-xs"
    >
      Made by
      <a
        target="_blank"
        class="hover:underline"
        href="https://emilenijssen.nl/?ref=wg-easy"
        >Emile Nijssen</a
      >
      ·
      <a
        class="hover:underline"
        href="https://github.com/sponsors/WeeJeWel"
        target="_blank"
        >Donate</a
      >
      ·
      <a
        class="hover:underline"
        href="https://github.com/wg-easy/wg-easy"
        target="_blank"
        >GitHub</a
      >
    </p>
  </main>
</template>
