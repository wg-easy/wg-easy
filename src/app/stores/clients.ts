import { defineStore } from 'pinia';
import { sha256 } from 'js-sha256';
import type { TypedInternalResponse } from 'nitropack/types';

type WGClientReturn = TypedInternalResponse<
  '/api/client',
  unknown,
  'get'
>[number];

export type LocalClient = WGClientReturn & {
  avatar?: string;
  transferMax?: number;
} & Omit<ClientPersist, 'transferRxPrevious' | 'transferTxPrevious'>;

export type ClientPersist = {
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

export const useClientsStore = defineStore('Clients', () => {
  const globalStore = useGlobalStore();
  const clients = ref<null | LocalClient[]>(null);
  const clientsPersist = ref<Record<string, ClientPersist>>({});

  const searchParams = ref({
    filter: undefined as string | undefined,
  });

  const { data: _clients, refresh: _refresh } = useFetch('/api/client', {
    method: 'get',
    params: searchParams,
  });

  // TODO: rewrite
  async function refresh({ updateCharts = false } = {}) {
    await _refresh();
    let transformedClients = _clients.value?.map((client) => {
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

      // We know that this can't be undefined
      const clientPersist = clientsPersist.value[client.id]!;

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

    // TODO: move sort to backend
    if (transformedClients !== undefined) {
      transformedClients = sortByProperty(
        transformedClients,
        'name',
        globalStore.sortClient
      );
    }

    clients.value = transformedClients ?? null;
  }

  function setSearchQuery(filter: string) {
    clients.value = null;
    searchParams.value.filter = filter || undefined;
  }

  return { clients, clientsPersist, refresh, _clients, setSearchQuery };
});
