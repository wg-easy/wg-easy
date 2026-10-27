import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { computed, ref, type ComputedRef } from 'vue';

import { useClientsStore } from '../../app/stores/clients';
import type { LocalClient } from '../../app/utils/client';

type Client = Pick<LocalClient, 'id' | 'name' | 'transferRx' | 'transferTx'>;
type Query = {
  page: number;
  pageSize: number;
  filter?: string;
  sort: string;
  sortBy: string;
  status: string;
  expiry: string;
};
type Page = {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
};

const data = ref<Page>();
const error = ref<Error | null>(null);
const refresh = vi.fn(async () => {});
let params: ComputedRef<Query>;
let pinia: ReturnType<typeof createPinia>;

function page(pageNumber = 1, total = 51): Page {
  const start = (pageNumber - 1) * 25;
  return {
    page: pageNumber,
    pageSize: 25,
    total,
    clients: Array.from(
      { length: Math.min(25, total - start) },
      (_, index) => ({
        id: start + index + 1,
        name: `Client ${start + index + 1}`,
        transferRx: 100,
        transferTx: 200,
      })
    ),
  };
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  data.value = page();
  error.value = null;
  refresh.mockReset();
  refresh.mockResolvedValue(undefined);
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('computed', computed);
  vi.stubGlobal(
    'useFetch',
    (_url: string, options: { params: ComputedRef<Query> }) => {
      params = options.params;
      return { data, error, refresh };
    }
  );
});

afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
});

describe('client list pagination', () => {
  test('uses server totals and requests 25 clients per page', async () => {
    const store = useClientsStore();
    await store.refresh();
    expect(params.value).toMatchObject({ page: 1, pageSize: 25 });
    expect(store.clients).toHaveLength(25);
    expect(store.pagination.total).toBe(51);
    expect(store.totalPages).toBe(3);

    data.value = page(2);
    await store.setPage(2);
    expect(params.value.page).toBe(2);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(store.pagination.page).toBe(2);
    expect(store.clients?.[0]?.id).toBe(26);
    expect(store.clients).toHaveLength(25);

    data.value = page(3);
    await store.setPage(99);
    expect(params.value.page).toBe(3);
    expect(store.clients?.map(({ id }) => id)).toEqual([51]);
  });

  test('resets the request to page one for search, sort, and clearing search', async () => {
    const store = useClientsStore();
    await store.refresh();
    data.value = page(2);
    await store.setPage(2);

    data.value = page(1, 30);
    void store.updateQuery({ filter: 'Client' });
    expect(params.value).toMatchObject({ page: 1, filter: 'Client' });
    await vi.waitFor(() => expect(store.pagination.page).toBe(1));

    data.value = page(2, 30);
    await store.setPage(2);
    data.value = page(1, 30);
    await store.updateQuery({ sortOrder: 'name:desc' });
    expect(params.value).toMatchObject({ page: 1, sort: 'desc' });
    expect(store.pagination.page).toBe(1);

    data.value = page(2, 30);
    await store.setPage(2);
    data.value = page();
    void store.updateQuery({ filter: undefined });
    expect(params.value).toMatchObject({ page: 1, filter: undefined });
    await vi.waitFor(() => expect(store.pagination.total).toBe(51));
  });

  test('accepts a clamped server page after deletions and handles an empty list', async () => {
    const store = useClientsStore();
    await store.refresh();
    data.value = page(3);
    await store.setPage(3);

    data.value = page(2, 50);
    await store.refresh();
    expect(store.pagination.page).toBe(2);
    expect(params.value.page).toBe(2);
    expect(store.clients).toHaveLength(25);

    data.value = page(1, 0);
    await store.refresh();
    expect(store.pagination.page).toBe(1);
    expect(store.totalPages).toBe(1);
    expect(store.clients).toEqual([]);
  });

  test('polls the selected page and resets traffic baselines when returning to a page', async () => {
    const store = useClientsStore();
    await store.refresh();
    data.value = page(2);
    await store.setPage(2);
    expect(store.clients?.some(({ id }) => id === 1)).toBe(false);

    data.value = page(2);
    data.value.clients[0]!.transferRx = 150;
    await store.refresh({ updateCharts: true });
    expect(params.value.page).toBe(2);
    expect(store.pagination.page).toBe(2);
    expect(store.clients?.[0]?.transferRxCurrent).toBe(50);

    data.value = page();
    data.value.clients[0]!.transferRx = 10000;
    await store.setPage(1);
    expect(store.clients?.[0]?.transferRxCurrent).toBe(0);
    expect(store.clients).toHaveLength(25);
  });

  test('retains traffic baselines by client ID when sorting changes their order', async () => {
    const store = useClientsStore();
    data.value = page(1, 2);
    await store.refresh({ updateCharts: true });
    const previousClients = store.clients!;
    expect(previousClients[0]?.transferRxCurrent).toBe(0);
    expect(previousClients[0]?.transferTxCurrent).toBe(0);

    data.value = page(1, 2);
    data.value.clients[0]!.transferRx = 130;
    data.value.clients[0]!.transferTx = 270;
    data.value.clients[1]!.transferRx = 180;
    data.value.clients[1]!.transferTx = 240;
    data.value.clients.reverse();
    await store.updateQuery({ sortOrder: 'name:desc' });
    expect(
      store.clients?.map(({ id, transferRxCurrent, transferTxCurrent }) => [
        id,
        transferRxCurrent,
        transferTxCurrent,
      ])
    ).toEqual([
      [2, 80, 40],
      [1, 30, 70],
    ]);
    // Sampling must not mutate the previously displayed snapshot.
    expect(previousClients[0]?.transferRxSeries[0]?.data).toEqual(
      Array(50).fill(0)
    );
  });

  test('keeps 50 chart samples and resumes from the latest totals after charts are paused', async () => {
    const store = useClientsStore();
    data.value = page(1, 1);
    await store.refresh({ updateCharts: true });
    const initialSeries = store.clients![0]!.transferRxSeries;
    for (let sample = 1; sample <= 55; sample++) {
      data.value = page(1, 1);
      data.value.clients[0]!.transferRx = 100 + sample * sample;
      data.value.clients[0]!.transferTx = 200 + sample * 3;
      await store.refresh({ updateCharts: true });
    }
    const history = store.clients![0]!.transferRxSeries;
    expect(history).toEqual([
      { name: 'Rx', data: Array.from({ length: 50 }, (_, i) => 11 + i * 2) },
    ]);
    expect(store.clients![0]!.transferTxSeries).toEqual([
      { name: 'Tx', data: Array(50).fill(3) },
    ]);
    expect(initialSeries[0]?.data).toEqual(Array(50).fill(0));

    data.value!.clients[0]!.transferRx! += 100;
    await store.refresh();
    expect(store.clients![0]!.transferRxCurrent).toBe(100);
    expect(store.clients![0]!.transferRxSeries).toEqual(history);

    data.value!.clients[0]!.transferRx! += 20;
    await store.refresh({ updateCharts: true });
    expect(store.clients![0]!.transferRxCurrent).toBe(20);
    expect(store.clients![0]!.transferRxSeries[0]?.data).toHaveLength(50);
    expect(store.clients![0]!.transferRxSeries[0]?.data.at(-1)).toBe(20);
    expect(history[0]?.data.at(-1)).toBe(109);
  });

  test('starts with zero traffic for a new client without live status', async () => {
    const store = useClientsStore();
    data.value = page(1, 1);
    data.value.clients[0]!.transferRx = null;
    data.value.clients[0]!.transferTx = null;
    await store.refresh();
    expect(store.clients![0]!.transferRxCurrent).toBe(0);
    expect(store.clients![0]!.transferRxSeries).toEqual([]);
    data.value = page(1, 1);
    await store.refresh({ updateCharts: true });
    expect(store.clients![0]!.transferRxCurrent).toBe(100);
    expect(store.clients![0]!.transferTxCurrent).toBe(200);
  });

  test('releases loading state and preserves the displayed page when fetching throws', async () => {
    const store = useClientsStore();
    await store.refresh();
    refresh.mockRejectedValueOnce(new Error('Network failure'));
    await expect(store.setPage(2)).rejects.toThrow('Network failure');
    expect(store.isUpdatingList).toBe(false);
    expect(store.pagination.page).toBe(1);
    expect(store.clients![0]!.id).toBe(1);
    data.value = page(2);
    await store.refresh();
    expect(store.pagination.page).toBe(2);
  });

  test('preserves the displayed page after a failed request and retries the requested page', async () => {
    const store = useClientsStore();
    await store.refresh();
    error.value = new Error('Connection interrupted');
    data.value = undefined;
    await store.setPage(2);
    expect(store.pagination.page).toBe(1);
    expect(store.pagination.total).toBe(51);
    expect(store.clients?.[0]?.id).toBe(1);
    expect(store.isUpdatingList).toBe(false);

    error.value = null;
    data.value = page(2);
    await store.refresh();
    expect(params.value.page).toBe(2);
    expect(store.pagination.page).toBe(2);
  });

  test('ignores an old poll that finishes after navigation', async () => {
    const store = useClientsStore();
    await store.refresh();
    let finishPoll!: () => void;
    refresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishPoll = resolve;
        })
    );
    const oldPoll = store.refresh();

    data.value = page(2);
    await store.setPage(2);
    data.value = page();
    finishPoll();
    await oldPoll;
    expect(store.pagination.page).toBe(2);
    expect(store.clients?.[0]?.id).toBe(26);
  });

  test('resets to page one for each filter and sort option, and clears filters together', async () => {
    const store = useClientsStore();
    await store.refresh();
    for (const change of [
      () => store.updateQuery({ status: 'online' }),
      () => store.updateQuery({ expiry: 'expiring' }),
      () => store.updateQuery({ sortOrder: 'createdAt:desc' }),
      () => store.updateQuery({ filter: ' Client ' }),
    ]) {
      data.value = page(2);
      await store.setPage(2);
      data.value = page();
      change();
      expect(params.value.page).toBe(1);
      await vi.waitFor(() => expect(store.pagination.page).toBe(1));
    }
    expect(params.value).toMatchObject({
      status: 'online',
      expiry: 'expiring',
      sortBy: 'createdAt',
      sort: 'desc',
      filter: 'Client',
    });
    expect(store.hasActiveFilters).toBe(true);
    store.clearFilters();
    expect(params.value).toMatchObject({
      status: 'all',
      expiry: 'all',
      filter: undefined,
      sortBy: 'createdAt',
      sort: 'desc',
    });
    expect(store.hasActiveFilters).toBe(false);
    await vi.waitFor(() => expect(store.isUpdatingList).toBe(false));
  });

  test('retains the displayed range until a new page size loads', async () => {
    const store = useClientsStore();
    await store.refresh();
    data.value = page(2);
    await store.setPage(2);
    let finish!: () => void;
    refresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    void store.updateQuery({ pageSize: 10 });
    expect(params.value).toMatchObject({ page: 1, pageSize: 10 });
    expect(store.isUpdatingList).toBe(true);
    expect(store.pagination.page).toBe(2);
    expect(store.pagination.pageSize).toBe(25);
    expect(store.clients?.[0]?.id).toBe(26);
    data.value = {
      ...page(),
      pageSize: 10,
      clients: page().clients.slice(0, 10),
    };
    finish();
    await vi.waitFor(() => expect(store.isUpdatingList).toBe(false));
    expect(store.pagination.page).toBe(1);
    expect(store.pagination.pageSize).toBe(10);
    expect(store.totalPages).toBe(6);
  });

  test('updates multiple query options in one request and keeps sort and page size when clearing filters', async () => {
    const store = useClientsStore();
    await store.updateQuery({
      filter: ' Client ',
      status: 'enabled',
      expiry: 'permanent',
      sortOrder: 'createdAt:desc',
      pageSize: 50,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(params.value).toMatchObject({
      filter: 'Client',
      status: 'enabled',
      expiry: 'permanent',
      sortBy: 'createdAt',
      sort: 'desc',
      pageSize: 50,
      page: 1,
    });
    await store.clearFilters();
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(store.query).toMatchObject({
      filter: undefined,
      status: 'all',
      expiry: 'all',
      sortOrder: 'createdAt:desc',
      pageSize: 50,
    });
  });

  test('ignores stale results after filters change during an in-flight request', async () => {
    const store = useClientsStore();
    await store.refresh();
    let finish!: () => void;
    refresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    void store.updateQuery({ status: 'online' });
    data.value = page(1, 0);
    void store.updateQuery({ status: 'disabled' });
    await vi.waitFor(() => expect(store.clients).toEqual([]));
    data.value = page();
    finish();
    await vi.waitFor(() => expect(store.isUpdatingList).toBe(false));
    expect(store.clients).toEqual([]);
    expect(store.pagination.total).toBe(0);
    expect(store.query.status).toBe('disabled');
  });
});
