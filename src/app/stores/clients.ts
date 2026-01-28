import { defineStore } from 'pinia';
import { sha256 } from 'js-sha256';
import type { TypedInternalResponse } from 'nitropack/types';

type WGClientReturn = TypedInternalResponse<
  '/api/client',
  unknown,
  'get'
>['clients'][number];

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
  const sortClient = ref<boolean>(true)
  const page = ref<number>(1);
  const limit = ref<number>(10);
  const total = ref<number>(0);

  const searchParams = ref({
    filter: undefined as string | undefined,
    page: page,
    limit: limit,
    sortClient: sortClient
  });

  const { data: _clients, refresh: _refresh } = useFetch('/api/client', {
    method: 'get',
    params: searchParams,
  });

  // TODO: rewrite
  async function refresh({ updateCharts = false } = {}) {
    await _refresh();
    let transformedClients = _clients.value?.clients.map((client) => {
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
      /* client.transferRx =
        clientPersist.transferRxPrevious + Math.random() * 1000;
      client.transferTx =
        clientPersist.transferTxPrevious + Math.random() * 1000;
      client.latestHandshakeAt = new Date().toISOString(); */

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

    clients.value = transformedClients ?? null;
    total.value = (_clients.value?.total ?? _clients.value?.clients?.length) ?? 0;
  }

  function setSearchQuery(filter: string) {
    clients.value = null;
    total.value = 0;
    setPageQuery(1);
    searchParams.value.filter = filter || undefined;
  }

  function setPageQuery(value: number) {
    clients.value = null;
    page.value = value;
    searchParams.value.page = value;
  }

  function setSortClientQuery(value: boolean) {
    clients.value = null;
    sortClient.value = value;
    searchParams.value.sortClient = value;
  }

  return { clients, clientsPersist, sortClient, page, total, limit, refresh, _clients, setSearchQuery, setPageQuery, setSortClientQuery };
});
