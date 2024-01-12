<script>
import { ref, reactive } from 'vue';
import sha256 from 'crypto-js/sha256';

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

    const dateTime = (value) => {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(value);
    };

    const refresh = async ({ updateCharts = false } = {}) => {
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
        // client.transferRx = clientsPersist[client.id].transferRxPrevious + Math.random() * 1000;
        // client.transferTx = clientsPersist[client.id].transferTxPrevious + Math.random() * 1000;

        if (updateCharts) {
          clientsPersist[client.id].transferRxCurrent =
            client.transferRx - clientsPersist[client.id].transferRxPrevious;
          clientsPersist[client.id].transferRxPrevious = client.transferRx;
          clientsPersist[client.id].transferTxCurrent =
            client.transferTx - clientsPersist[client.id].transferTxPrevious;
          clientsPersist[client.id].transferTxPrevious = client.transferTx;

          clientsPersist[client.id].transferRxHistory.push(
            clientsPersist[client.id].transferRxCurrent
          );
          clientsPersist[client.id].transferRxHistory.shift();

          clientsPersist[client.id].transferTxHistory.push(
            clientsPersist[client.id].transferTxCurrent
          );
          clientsPersist[client.id].transferTxHistory.shift();
        }

        client.transferTxCurrent = clientsPersist[client.id].transferTxCurrent;
        client.transferRxCurrent = clientsPersist[client.id].transferRxCurrent;

        client.transferTxHistory = clientsPersist[client.id].transferTxHistory;
        client.transferRxHistory = clientsPersist[client.id].transferRxHistory;
        client.transferMax = Math.max(
          ...client.transferTxHistory,
          ...client.transferRxHistory
        );

        client.hoverTx = clientsPersist[client.id].hoverTx;
        client.hoverRx = clientsPersist[client.id].hoverRx;

        return client;
      });
    };

    const login = (e) => {
      e.preventDefault();

      if (!password.value) return;
      if (authenticating.value) return;

      authenticating.value = true;
      api
        .createSession({
          password: password.value,
        })
        .then(async () => {
          const session = await api.getSession();
          authenticated.value = session.authenticated;
          requiresPassword.value = session.requiresPassword;
          return refresh();
        })
        .catch((err) => {
          alert(err.message || err.toString());
        })
        .finally(() => {
          authenticating.value = false;
          password.value = null;
        });
    };

    const logout = (e) => {
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
    };

    const createClient = () => {
      const name = clientCreateName.value;
      if (!name) return;

      api
        .createClient({ name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => refresh().catch(console.error));
    };

    const deleteClient = (client) => {
      api
        .deleteClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => refresh().catch(console.error));
    };

    const enableClient = (client) => {
      api
        .enableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => refresh().catch(console.error));
    };

    const disableClient = (client) => {
      api
        .disableClient({ clientId: client.id })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => refresh().catch(console.error));
    };

    const updateClientName = (client, name) => {
      api
        .updateClientName({ clientId: client.id, name })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => refresh().catch(console.error));
    };

    const updateClientAddress = (client, address) => {
      api
        .updateClientAddress({ clientId: client.id, address })
        .catch((err) => alert(err.message || err.toString()))
        .finally(() => refresh().catch(console.error));
    };

    const toggleTheme = () => {
      if (isDark.value) {
        localStorage.theme = 'light';
        document.documentElement.classList.remove('dark');
      } else {
        localStorage.theme = 'dark';
        document.documentElement.classList.add('dark');
      }
      isDark.value = !isDark.value;
    };

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
      refresh,
      login,
      logout,
      createClient,
      deleteClient,
      enableClient,
      disableClient,
      updateClientName,
      updateClientAddress,
      toggleTheme,

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
          <svg
            class="h-3 inline"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
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

        <div
          v-if="latestRelease"
          class="bg-red-800 dark:bg-red-100 p-4 text-white dark:text-red-600 text-sm font-small mb-10 rounded-md shadow-lg"
          :title="`v${currentRelease} → v${latestRelease.version}`"
        >
          <div class="container mx-auto flex flex-row flex-auto items-center">
            <div class="flex-grow">
              <p class="font-bold">There is an update available!</p>
              <p>{{ latestRelease.changelog }}</p>
            </div>

            <a
              href="https://github.com/wg-easy/wg-easy#updating"
              target="_blank"
              class="p-3 rounded-md bg-white dark:bg-red-100 float-right font-sm font-semibold text-red-800 dark:text-red-600 flex-shrink-0 border-2 border-red-800 dark:border-red-600 hover:border-white dark:hover:border-red-600 hover:text-white dark:hover:text-red-100 hover:bg-red-800 dark:hover:bg-red-600 transition-all"
            >
              Update →
            </a>
          </div>
        </div>

        <div
          class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden"
        >
          <div
            class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600"
          >
            <div class="flex-grow">
              <p class="text-2xl font-medium dark:text-neutral-200">Clients</p>
            </div>
            <div class="flex-shrink-0">
              <button
                @click="
                  clientCreate = true;
                  clientCreateName = '';
                "
                class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-600 py-2 px-4 rounded inline-flex items-center transition"
              >
                <svg
                  class="w-4 mr-2"
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
                <span class="text-sm">New</span>
              </button>
            </div>
          </div>

          <div>
            <!-- Client -->
            <div
              v-if="clients && clients.length > 0"
              v-for="client in clients"
              :key="client.id"
              class="relative overflow-hidden border-b last:border-b-0 border-gray-100 dark:border-neutral-600 border-solid"
            >
              <!-- Chart -->
              <!-- FIXME: Not working yet -->
              <!-- <div class="absolute z-0 bottom-0 left-0 right-0" style="top: 60%">
                <apexchart
                  width="100%"
                  height="100%"
                  :options="client.chartOptions"
                  :series="client.transferTxSeries"
                >
                </apexchart>
              </div>
              <div class="absolute z-0 top-0 left-0 right-0" style="bottom: 60%">
                <apexchart
                  width="100%"
                  height="100%"
                  :options="client.chartOptions"
                  :series="client.transferRxSeries"
                  style="transform: scaleY(-1)"
                >
                </apexchart>
              </div> -->

              <div
                class="relative p-5 z-10 flex flex-col md:flex-row justify-between"
              >
                <div class="flex items-center pb-2 md:pb-0">
                  <div class="h-10 w-10 mr-5 rounded-full bg-gray-50 relative">
                    <svg
                      class="w-6 m-2 text-gray-300"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <img
                      v-if="client.avatar"
                      :src="client.avatar"
                      class="w-10 rounded-full absolute top-0 left-0"
                    />

                    <div
                      v-if="
                        client.latestHandshakeAt &&
                        new Date() - new Date(client.latestHandshakeAt) <
                          1000 * 60 * 10
                      "
                    >
                      <div
                        class="animate-ping w-4 h-4 p-1 bg-red-100 dark:bg-red-100 rounded-full absolute -bottom-1 -right-1"
                      ></div>
                      <div
                        class="w-2 h-2 bg-red-800 dark:bg-red-600 rounded-full absolute bottom-0 right-0"
                      ></div>
                    </div>
                  </div>

                  <div class="flex-grow">
                    <!-- Name -->
                    <div
                      class="text-gray-700 dark:text-neutral-200 group"
                      :title="
                        'Created on ' + dateTime(new Date(client.createdAt))
                      "
                    >
                      <!-- Show -->
                      <input
                        v-show="clientEditNameId === client.id"
                        v-model="clientEditName"
                        v-on:keyup.enter="
                          updateClientName(client, clientEditName);
                          clientEditName = null;
                          clientEditNameId = null;
                        "
                        v-on:keyup.escape="
                          clientEditName = null;
                          clientEditNameId = null;
                        "
                        :ref="'client-' + client.id + '-name'"
                        class="rounded px-1 border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 dark:placeholder:text-neutral-500 outline-none w-30"
                      />
                      <span
                        v-show="clientEditNameId !== client.id"
                        class="inline-block border-t-2 border-b-2 border-transparent"
                        >{{ client.name }}</span
                      >

                      <!-- Edit -->
                      <span
                        v-show="clientEditNameId !== client.id"
                        @click="
                          clientEditName = client.name;
                          clientEditNameId = client.id;
                          setTimeout(
                            () =>
                              $refs[
                                'client-' + client.id + '-name'
                              ][0].select(),
                            1
                          );
                        "
                        class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4 inline align-middle opacity-25 hover:opacity-100"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </span>
                    </div>

                    <!-- Info -->
                    <div class="text-gray-400 dark:text-neutral-400 text-xs">
                      <!-- Address -->
                      <span class="group block md:inline-block pb-1 md:pb-0">
                        <!-- Show -->
                        <input
                          v-show="clientEditAddressId === client.id"
                          v-model="clientEditAddress"
                          v-on:keyup.enter="
                            updateClientAddress(client, clientEditAddress);
                            clientEditAddress = null;
                            clientEditAddressId = null;
                          "
                          v-on:keyup.escape="
                            clientEditAddress = null;
                            clientEditAddressId = null;
                          "
                          :ref="'client-' + client.id + '-address'"
                          class="rounded border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 outline-none w-20 text-black dark:text-neutral-300 dark:placeholder:text-neutral-500"
                        />
                        <span
                          v-show="clientEditAddressId !== client.id"
                          class="inline-block border-t-2 border-b-2 border-transparent"
                          >{{ client.address }}</span
                        >

                        <!-- Edit -->
                        <span
                          v-show="clientEditAddressId !== client.id"
                          @click="
                            clientEditAddress = client.address;
                            clientEditAddressId = client.id;
                            setTimeout(
                              () =>
                                $refs[
                                  'client-' + client.id + '-address'
                                ][0].select(),
                              1
                            );
                          "
                          class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 inline align-middle opacity-25 hover:opacity-100"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </span>
                      </span>

                      <!-- Transfer TX -->
                      <!-- FIXME: add "bytes" -->
                      <span
                        v-if="client.transferTx"
                        :title="'Total Download: ' + bytes(client.transferTx)"
                      >
                        ·
                        <svg
                          class="align-middle h-3 inline"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <!-- FIXME: add "bytes" -->
                        {{ client.transferTxCurrent | bytes }}/s
                      </span>

                      <!-- Transfer RX -->
                      <!-- FIXME: add "bytes" -->
                      <span
                        v-if="client.transferRx"
                        :title="'Total Upload: ' + bytes(client.transferRx)"
                      >
                        ·
                        <svg
                          class="align-middle h-3 inline"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <!-- FIXME: add "bytes" -->
                        {{ client.transferRxCurrent | bytes }}/s
                      </span>

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
                        · {{ new Date(client.latestHandshakeAt) }}
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
                      <svg
                        class="w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
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
                      <svg
                        class="w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>

                    <!-- Delete -->
                    <button
                      class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white p-2 rounded transition"
                      title="Delete Client"
                      @click="clientDelete = client"
                    >
                      <svg
                        class="w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clip-rule="evenodd"
                        />
                      </svg>
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
                  <svg
                    class="w-4 mr-2"
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
                  <span class="text-sm">New Client</span>
                </button>
              </p>
            </div>
            <div
              v-if="clients === null"
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
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
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
            <svg
              class="w-10 h-10 m-5 text-white dark:text-white"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd"
              />
            </svg>
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
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
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
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
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
