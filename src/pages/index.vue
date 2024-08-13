<template>
  <div v-cloak class="container mx-auto max-w-3xl px-3 md:px-0 mt-4 xs:mt-6">
    <div v-if="authenticated === true">
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
          <div class="flex md:block md:flex-shrink-0">
            <!-- Restore configuration -->
            <ClientsRestoreConfig />
            <!-- Backup configuration -->
            <ClientsBackupConfig />
            <!-- New client -->
            <button
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 max-md:border-l-0 border-2 border-gray-100 dark:border-neutral-600 py-2 px-4 rounded-r-full md:rounded inline-flex items-center transition"
              @click="
                clientCreate = true;
                clientCreateName = '';
              "
            >
              <svg
                class="w-4 md:mr-2"
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
              <span class="max-md:hidden text-sm">{{ $t('new') }}</span>
            </button>
          </div>
        </div>

        <div>
          <!-- Client -->
          <div v-if="clients && clients.length > 0">
            <div
              v-for="client in clients"
              :key="client.id"
              class="relative overflow-hidden border-b last:border-b-0 border-gray-100 dark:border-neutral-600 border-solid"
            >
              <!-- Chart -->
              <div
                v-if="uiChartType"
                :class="`absolute z-0 bottom-0 left-0 right-0 h-6 ${uiChartType === 1 && 'line-chart'}`"
              >
                <ClientOnly>
                  <apexchart
                    width="100%"
                    height="100%"
                    :options="chartOptionsTX"
                    :series="client.transferTxSeries"
                  />
                </ClientOnly>
              </div>
              <div
                v-if="uiChartType"
                :class="`absolute z-0 top-0 left-0 right-0 h-6 ${uiChartType === 1 && 'line-chart'}`"
              >
                <ClientOnly>
                  <apexchart
                    width="100%"
                    height="100%"
                    :options="chartOptionsRX"
                    :series="client.transferRxSeries"
                    style="transform: scaleY(-1)"
                  />
                </ClientOnly>
              </div>
              <div
                class="relative py-3 md:py-5 px-3 z-10 flex flex-col sm:flex-row justify-between gap-3"
              >
                <div class="flex gap-3 md:gap-4 w-full items-center">
                  <!-- Avatar -->
                  <div
                    class="h-10 w-10 mt-2 self-start rounded-full bg-gray-50 relative"
                  >
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
                        new Date().getTime() -
                          new Date(client.latestHandshakeAt).getTime() <
                          1000 * 60 * 10
                      "
                    >
                      <div
                        class="animate-ping w-4 h-4 p-1 bg-red-100 dark:bg-red-100 rounded-full absolute -bottom-1 -right-1"
                      />
                      <div
                        class="w-2 h-2 bg-red-800 dark:bg-red-600 rounded-full absolute bottom-0 right-0"
                      />
                    </div>
                  </div>

                  <!-- Name & Info -->
                  <div class="flex flex-col xxs:flex-row w-full gap-2">
                    <!-- Name -->
                    <div class="flex flex-col flex-grow gap-1">
                      <div
                        class="text-gray-700 dark:text-neutral-200 group text-sm md:text-base"
                        :title="
                          $t('createdOn') + dateTime(new Date(client.createdAt))
                        "
                      >
                        <!-- Show -->
                        <input
                          v-show="clientEditNameId === client.id"
                          :ref="'client-' + client.id + '-name'"
                          v-model="clientEditName"
                          class="rounded px-1 border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 dark:placeholder:text-neutral-500 outline-none w-30"
                          @keyup.enter="
                            updateClientName(client, clientEditName);
                            clientEditName = null;
                            clientEditNameId = null;
                          "
                          @keyup.escape="
                            clientEditName = null;
                            clientEditNameId = null;
                          "
                        />
                        <span
                          v-show="clientEditNameId !== client.id"
                          class="border-t-2 border-b-2 border-transparent"
                          >{{ client.name }}</span
                        >

                        <!-- Edit -->
                        <span
                          v-show="clientEditNameId !== client.id"
                          class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          @click="
                            clientEditName = client.name;
                            clientEditNameId = client.id;
                            nextTick(() =>
                              $refs['client-' + client.id + '-name'][0].select()
                            );
                          "
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
                      <!-- Address -->
                      <div
                        class="block md:inline-block pb-1 md:pb-0 text-gray-500 dark:text-neutral-400 text-xs"
                      >
                        <span class="group">
                          <!-- Show -->
                          <input
                            v-show="clientEditAddressId === client.id"
                            :ref="'client-' + client.id + '-address'"
                            v-model="clientEditAddress"
                            class="rounded border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 outline-none w-20 text-black dark:text-neutral-300 dark:placeholder:text-neutral-500"
                            @keyup.enter="
                              updateClientAddress(client, clientEditAddress);
                              clientEditAddress = null;
                              clientEditAddressId = null;
                            "
                            @keyup.escape="
                              clientEditAddress = null;
                              clientEditAddressId = null;
                            "
                          />
                          <span
                            v-show="clientEditAddressId !== client.id"
                            class="inline-block"
                            >{{ client.address }}</span
                          >

                          <!-- Edit -->
                          <span
                            v-show="clientEditAddressId !== client.id"
                            class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            @click="
                              clientEditAddress = client.address;
                              clientEditAddressId = client.id;
                              nextTick(() =>
                                $refs[
                                  'client-' + client.id + '-address'
                                ][0].select()
                              );
                            "
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
                        <!-- Inline Transfer TX -->
                        <span
                          v-if="!uiTrafficStats && client.transferTx"
                          class="whitespace-nowrap"
                          :title="
                            $t('totalDownload') + bytes(client.transferTx)
                          "
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
                          {{ bytes(client.transferTxCurrent) }}/s
                        </span>

                        <!-- Inline Transfer RX -->
                        <span
                          v-if="!uiTrafficStats && client.transferRx"
                          class="whitespace-nowrap"
                          :title="$t('totalUpload') + bytes(client.transferRx)"
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
                          {{ bytes(client.transferRxCurrent) }}/s
                        </span>
                        <!-- Last seen -->
                        <span
                          v-if="client.latestHandshakeAt"
                          class="text-gray-400 dark:text-neutral-500 whitespace-nowrap"
                          :title="
                            $t('lastSeen') +
                            dateTime(new Date(client.latestHandshakeAt))
                          "
                        >
                          {{ !uiTrafficStats ? ' · ' : ''
                          }}{{ timeago(new Date(client.latestHandshakeAt)) }}
                        </span>
                      </div>
                    </div>

                    <!-- Info -->
                    <div
                      v-if="uiTrafficStats"
                      class="flex gap-2 items-center shrink-0 text-gray-400 dark:text-neutral-400 text-xs mt-px justify-end"
                    >
                      <!-- Transfer TX -->
                      <div
                        v-if="client.transferTx"
                        class="min-w-20 md:min-w-24"
                      >
                        <span
                          class="flex gap-1"
                          :title="
                            $t('totalDownload') + bytes(client.transferTx)
                          "
                        >
                          <svg
                            class="align-middle h-3 inline mt-0.5"
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
                          <div>
                            <span class="text-gray-700 dark:text-neutral-200"
                              >{{ bytes(client.transferTxCurrent) }}/s</span
                            >
                            <!-- Total TX -->
                            <br /><span
                              class="font-regular"
                              style="font-size: 0.85em"
                              >{{ bytes(client.transferTx) }}</span
                            >
                          </div>
                        </span>
                      </div>

                      <!-- Transfer RX -->
                      <div
                        v-if="client.transferRx"
                        class="min-w-20 md:min-w-24"
                      >
                        <span
                          class="flex gap-1"
                          :title="$t('totalUpload') + bytes(client.transferRx)"
                        >
                          <svg
                            class="align-middle h-3 inline mt-0.5"
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
                          <div>
                            <span class="text-gray-700 dark:text-neutral-200"
                              >{{ bytes(client.transferRxCurrent) }}/s</span
                            >
                            <!-- Total RX -->
                            <br /><span
                              class="font-regular"
                              style="font-size: 0.85em"
                              >{{ bytes(client.transferRx) }}</span
                            >
                          </div>
                        </span>
                      </div>
                    </div>
                  </div>
                  <!-- </div> -->
                  <!-- <div class="flex flex-grow items-center"> -->
                </div>

                <div class="flex items-center justify-end">
                  <div
                    class="text-gray-400 dark:text-neutral-400 flex gap-1 items-center justify-between"
                  >
                    <!-- Enable/Disable -->
                    <div
                      v-if="client.enabled === true"
                      :title="$t('disableClient')"
                      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700 transition-all"
                      @click="disableClient(client)"
                    >
                      <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white" />
                    </div>

                    <div
                      v-if="client.enabled === false"
                      :title="$t('enableClient')"
                      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 dark:bg-neutral-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-neutral-500 transition-all"
                      @click="enableClient(client)"
                    >
                      <div class="rounded-full w-4 h-4 m-1 bg-white" />
                    </div>

                    <!-- Show QR-->

                    <button
                      :disabled="!client.downloadableConfig"
                      class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded transition"
                      :class="{
                        'hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white':
                          client.downloadableConfig,
                        'is-disabled': !client.downloadableConfig,
                      }"
                      :title="
                        !client.downloadableConfig
                          ? $t('noPrivKey')
                          : $t('showQR')
                      "
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
                      :disabled="!client.downloadableConfig"
                      :href="
                        './api/wireguard/client/' + client.id + '/configuration'
                      "
                      :download="
                        client.downloadableConfig ? 'configuration' : null
                      "
                      class="align-middle inline-block bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded transition"
                      :class="{
                        'hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white':
                          client.downloadableConfig,
                        'is-disabled': !client.downloadableConfig,
                      }"
                      :title="
                        !client.downloadableConfig
                          ? $t('noPrivKey')
                          : $t('downloadConfig')
                      "
                      @click="
                        if (!client.downloadableConfig) {
                          $event.preventDefault();
                        }
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>

                    <!-- Delete -->

                    <button
                      class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white p-2 rounded transition"
                      :title="$t('deleteClient')"
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
          </div>
          <div v-if="clients && clients.length === 0">
            <p
              class="text-center m-10 text-gray-400 dark:text-neutral-400 text-sm"
            >
              {{ $t('noClients') }}<br /><br />
              <button
                class="bg-red-800 hover:bg-red-700 text-white border-2 border-none py-2 px-4 rounded inline-flex items-center transition"
                @click="
                  clientCreate = true;
                  clientCreateName = '';
                "
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
                <span class="text-sm">{{ $t('newClient') }}</span>
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
      <div v-if="qrcode">
        <div
          class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20"
        >
          <div class="bg-white rounded-md shadow-lg relative p-8">
            <button
              class="absolute right-4 top-4 text-gray-600 dark:text-neutral-500 hover:text-gray-800 dark:hover:text-neutral-700"
              @click="qrcode = null"
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
                        v-model.trim="clientCreateName"
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
                v-if="clientCreateName.length"
                type="button"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-800 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                @click="
                  createClient();
                  clientCreate = null;
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
                @click="clientCreate = null"
              >
                {{ $t('cancel') }}
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
                      <strong>{{ clientDelete.name }}</strong
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
                  deleteClient(clientDelete);
                  clientDelete = null;
                "
              >
                {{ $t('deleteClient') }}
              </button>
              <button
                type="button"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-500 shadow-sm px-4 py-2 bg-white dark:bg-neutral-500 text-base font-medium text-gray-700 dark:text-neutral-50 hover:bg-gray-50 dark:hover:bg-neutral-600 dark:hover:border-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                @click="clientDelete = null"
              >
                {{ $t('cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
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
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { sha256 } from 'js-sha256';
import { format as timeago } from 'timeago.js';

const UI_CHART_TYPES = [
  { type: false, strokeWidth: 0 },
  { type: 'line', strokeWidth: 3 },
  { type: 'area', strokeWidth: 0 },
  { type: 'bar', strokeWidth: 0 },
];

const CHART_COLORS = {
  rx: { light: 'rgba(128,128,128,0.3)', dark: 'rgba(255,255,255,0.3)' },
  tx: { light: 'rgba(128,128,128,0.4)', dark: 'rgba(255,255,255,0.3)' },
  gradient: {
    light: ['rgba(0,0,0,1.0)', 'rgba(0,0,0,1.0)'],
    dark: ['rgba(128,128,128,0)', 'rgba(128,128,128,0)'],
  },
};

const authenticated = ref<null | boolean>(null);
const requiresPassword = ref<null | boolean>(null);

type LocalClient = WGClient & {
  avatar?: string;
  transferMax?: number;
} & Omit<ClientPersist, 'transferRxPrevious' | 'transferTxPrevious'>;

type ClientPersist = {
  transferRxHistory: number[];
  transferRxPrevious: number;
  transferRxCurrent: number;
  transferRxSeries: { name: string; data: number[] }[];
  hoverRx?: unknown;
  transferTxHistory: number[];
  transferTxPrevious: number;
  transferTxCurrent: number;
  transferTxSeries: { name: string; data: number[] }[];
  hoverTx?: unknown;
};

const clients = ref<null | LocalClient[]>(null);
const clientsPersist = ref<Record<string, ClientPersist>>({});
const clientDelete = ref<null | WGClient>(null);
const clientCreate = ref<null | boolean>(null);
const clientCreateName = ref<string>('');
const clientEditName = ref<null | string>(null);
const clientEditNameId = ref<null | string>(null);
const clientEditAddress = ref<null | string>(null);
const clientEditAddressId = ref<null | string>(null);
const qrcode = ref<null | string>(null);

const currentRelease = ref<null | number>(null);
const latestRelease = ref<null | { version: number; changelog: string }>(null);

const uiTrafficStats = ref(false);

const uiChartType = ref(0);
const uiShowCharts = ref(getItem('uiShowCharts') === '1');

const theme = useTheme();

const chartOptions = {
  chart: {
    type: false as string | boolean,
    background: 'transparent',
    stacked: false,
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
    parentHeightOffset: 0,
    sparkline: {
      enabled: true,
    },
  },
  colors: [],
  stroke: {
    curve: 'smooth',
    width: 0,
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'vertical',
      shadeIntensity: 0,
      gradientToColors: CHART_COLORS.gradient[theme.value],
      inverseColors: false,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
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
      show: false,
    },
    axisBorder: {
      show: false,
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
};

function dateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(value);
}
async function refresh({ updateCharts = false } = {}) {
  if (!authenticated.value) return;

  const _clients = await api.getClients();
  clients.value = _clients.map((client) => {
    let avatar = undefined;
    if (client.name.includes('@') && client.name.includes('.')) {
      avatar = `https://gravatar.com/avatar/${sha256(client.name.toLowerCase().trim())}.jpg`;
    }

    if (!clientsPersist.value[client.id]) {
      clientsPersist.value[client.id] = {
        transferRxHistory: Array(50).fill(0),
        transferRxPrevious: client.transferRx ?? 0,
        transferTxHistory: Array(50).fill(0),
        transferTxPrevious: client.transferTx ?? 0,
        transferRxCurrent: 0,
        transferTxCurrent: 0,
        transferRxSeries: [],
        transferTxSeries: [],
      };
    }

    const clientPersist = clientsPersist.value[client.id];

    // Debug
    // client.transferRx = this.clientsPersist[client.id].transferRxPrevious + Math.random() * 1000;
    // client.transferTx = this.clientsPersist[client.id].transferTxPrevious + Math.random() * 1000;
    // client.latestHandshakeAt = new Date();
    // this.requiresPassword = true;

    clientPersist.transferRxCurrent =
      (client.transferRx ?? 0) - clientPersist.transferRxPrevious;

    clientPersist.transferRxPrevious = client.transferRx ?? 0;

    clientPersist.transferTxCurrent =
      (client.transferTx ?? 0) - clientPersist.transferTxPrevious;

    clientPersist.transferTxPrevious = client.transferTx ?? 0;

    let transferMax = undefined;

    if (updateCharts) {
      clientPersist.transferRxHistory.push(clientPersist.transferRxCurrent);
      clientPersist.transferRxHistory.shift();

      clientPersist.transferTxHistory.push(clientPersist.transferTxCurrent);
      clientPersist.transferTxHistory.shift();

      clientPersist.transferTxSeries = [
        {
          name: 'Tx',
          data: clientPersist.transferTxHistory,
        },
      ];

      clientPersist.transferRxSeries = [
        {
          name: 'Rx',
          data: clientPersist.transferRxHistory,
        },
      ];

      transferMax = Math.max(
        ...clientPersist.transferTxHistory,
        ...clientPersist.transferRxHistory
      );
    }

    return {
      ...client,
      avatar,
      transferTxHistory: clientPersist.transferTxHistory,
      transferRxHistory: clientPersist.transferRxHistory,
      transferMax,
      transferTxSeries: clientPersist.transferTxSeries,
      transferRxSeries: clientPersist.transferRxSeries,
      transferTxCurrent: clientPersist.transferTxCurrent,
      transferRxCurrent: clientPersist.transferRxCurrent,
      hoverTx: clientPersist.hoverTx,
      hoverRx: clientPersist.hoverRx,
    };
  });
}
function createClient() {
  const name = clientCreateName.value;
  if (!name) return;

  api
    .createClient({ name })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}
function deleteClient(client: WGClient | null) {
  if (client === null) {
    return;
  }
  api
    .deleteClient({ clientId: client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}
function enableClient(client: WGClient) {
  api
    .enableClient({ clientId: client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}
function disableClient(client: WGClient) {
  api
    .disableClient({ clientId: client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}
function updateClientName(client: WGClient, name: string | null) {
  if (name === null) {
    return;
  }
  api
    .updateClientName({ clientId: client.id, name })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}
function updateClientAddress(client: WGClient, address: string | null) {
  if (address === null) {
    return;
  }
  api
    .updateClientAddress({ clientId: client.id, address })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}

const { availableLocales, locale } = useI18n();

onMounted(() => {
  api
    .getSession()
    .then((session) => {
      if (session.requiresPassword && !session.authenticated) {
        window.location.replace('/login');
      }

      authenticated.value = session.authenticated;
      requiresPassword.value = session.requiresPassword;
      refresh({
        updateCharts: updateCharts.value,
      }).catch((err) => {
        alert(err.message || err.toString());
      });
    })
    .catch((err) => {
      alert(err.message || err.toString());
    });

  setInterval(() => {
    refresh({
      updateCharts: updateCharts.value,
    }).catch(console.error);
  }, 1000);

  api
    .getUITrafficStats()
    .then((res) => {
      uiTrafficStats.value = res;
    })
    .catch(() => {
      uiTrafficStats.value = false;
    });

  api
    .getChartType()
    .then((res) => {
      uiChartType.value = res;
    })
    .catch(() => {
      uiChartType.value = 0;
    });

  Promise.resolve()
    .then(async () => {
      const lang = await api.getLang();
      if (lang !== getItem('lang') && availableLocales.includes(lang)) {
        setItem('lang', lang);
        locale.value = lang;
      }

      const _currentRelease = await api.getRelease();
      const _latestRelease = await fetch(
        'https://wg-easy.github.io/wg-easy/changelog.json'
      )
        .then((res) => res.json())
        .then((releases) => {
          const releasesArray = Object.entries(releases).map(
            ([version, changelog]) => ({
              version: parseInt(version, 10),
              changelog: changelog as string,
            })
          );
          releasesArray.sort((a, b) => {
            return b.version - a.version;
          });

          return releasesArray[0];
        });

      if (_currentRelease >= _latestRelease.version) return;

      currentRelease.value = _currentRelease;
      latestRelease.value = _latestRelease;
    })
    .catch((err) => console.error(err));
});

const chartOptionsTX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.tx[theme.value]],
  };
  opts.chart.type = UI_CHART_TYPES[uiChartType.value].type || false;
  opts.stroke.width = UI_CHART_TYPES[uiChartType.value].strokeWidth;
  return opts;
});

const chartOptionsRX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.rx[theme.value]],
  };
  opts.chart.type = UI_CHART_TYPES[uiChartType.value].type || false;
  opts.stroke.width = UI_CHART_TYPES[uiChartType.value].strokeWidth;
  return opts;
});

const updateCharts = computed(() => {
  return uiChartType.value > 0 && uiShowCharts.value;
});

function bytes(bytes: number, decimals = 2, kib = false, maxunit?: string) {
  if (bytes === 0) return '0 B';
  if (Number.isNaN(bytes) && !Number.isFinite(bytes)) return 'NaN';
  const k = kib ? 1024 : 1000;
  const dm =
    decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
  const sizes = kib
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (maxunit !== undefined) {
    const index = sizes.indexOf(maxunit);
    if (index !== -1) i = index;
  }
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
</script>
