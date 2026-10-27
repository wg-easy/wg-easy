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
const bulkFetch = vi.fn();
let params: ComputedRef<Query>;
let pinia: ReturnType<typeof createPinia>;

function page(pageNumber = 1, total = 51, pageSize = 25): Page {
  const start = (pageNumber - 1) * pageSize;
  return {
    page: pageNumber,
    pageSize,
    total,
    clients: Array.from(
      { length: Math.min(pageSize, total - start) },
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
  bulkFetch.mockReset();
  bulkFetch.mockResolvedValue({ success: true });
  vi.stubGlobal('$fetch', bulkFetch);
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

describe('client bulk selection', () => {
  test('selects individual clients and only the displayed page, with mixed state', async () => {
    const store = useClientsStore();
    await store.refresh();
    expect(store.pageSelection).toBe(false);
    store.selectClient(1, true);
    store.selectClient(1, true);
    store.selectClient(26, true);
    expect(store.selectedIds).toEqual([1]);
    expect(store.pageSelection).toBe('indeterminate');
    store.selectPage(true);
    expect(store.selectedClients).toHaveLength(25);
    expect(store.pageSelection).toBe(true);
    store.selectClient(1, false);
    expect(store.selectedIds).not.toContain(1);
    expect(store.pageSelection).toBe('indeterminate');
    store.selectPage(false);
    expect(store.selectedIds).toEqual([]);
  });

  test('preserves selection on polls and drops clients that disappear', async () => {
    const store = useClientsStore();
    await store.refresh();
    store.selectClient(1, true);
    store.selectClient(2, true);
    await store.refresh();
    expect(store.selectedIds).toEqual([1, 2]);
    data.value!.clients = data.value!.clients.filter(({ id }) => id !== 1);
    await store.refresh();
    expect(store.selectedIds).toEqual([2]);
  });

  test('blocks duplicate submissions, selection changes, and polls during an action', async () => {
    const store = useClientsStore();
    await store.refresh();
    store.selectClient(1, true);
    const request = Promise.withResolvers<undefined>();
    bulkFetch.mockReturnValueOnce(request.promise);
    const action = store.applyBulkAction('disable');
    expect(store.isApplyingBulk).toBe(true);
    store.selectClient(2, true);
    store.selectPage(true);
    expect(store.selectedIds).toEqual([1]);
    await store.refresh();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await store.applyBulkAction('delete')).toBe(false);
    expect(bulkFetch).toHaveBeenCalledExactlyOnceWith('/api/client/bulk', {
      method: 'post',
      body: { action: 'disable', clientIds: [1] },
    });
    request.resolve(undefined);
    expect(await action).toBe(true);
    expect(store.isApplyingBulk).toBe(false);
    expect(store.selectedIds).toEqual([]);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('retains selection after a rejected action and refreshes the displayed state', async () => {
    const store = useClientsStore();
    await store.refresh();
    store.selectClient(1, true);
    bulkFetch.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(store.applyBulkAction('delete')).rejects.toThrow(
      'Permission denied'
    );
    expect(store.selectedIds).toEqual([1]);
    expect(store.isApplyingBulk).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('does not submit an empty selection', async () => {
    const store = useClientsStore();
    await store.refresh();
    expect(await store.applyBulkAction('delete')).toBe(false);
    expect(bulkFetch).not.toHaveBeenCalled();
  });
});

describe('client list pagination', () => {
  test('uses server totals and requests 25 clients per page', async () => {
    const store = useClientsStore();
    await store.refresh();
    expect(params.value).toMatchObject({ page: 1, pageSize: 25 });
    expect(store.clients).toHaveLength(25);
    expect(store.pagination.total).toBe(51);
    expect(store.totalPages).toBe(3);

    store.selectPage(true);
    data.value = page(2);
    await store.setPage(2);
    expect(store.selectedIds).toEqual([]);
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

  test.each([
    [{ filter: ' Client ' }, { filter: 'Client' }],
    [{ filter: undefined }, { filter: undefined }],
    [{ status: 'online' }, { status: 'online' }],
    [{ expiry: 'expiring' }, { expiry: 'expiring' }],
    [{ sortOrder: 'createdAt:desc' }, { sortBy: 'createdAt', sort: 'desc' }],
    [{ pageSize: 10 }, { pageSize: 10 }],
  ] as const)(
    'query changes reset the page and selection: %j',
    async (query, expected) => {
      const store = useClientsStore();
      await store.updateQuery({ filter: 'Previous search' });
      data.value = page(2);
      await store.setPage(2);
      store.selectPage(true);
      data.value = page(1, 51, 'pageSize' in query ? query.pageSize : 25);
      await store.updateQuery(query);
      expect(params.value).toMatchObject({ page: 1, ...expected });
      expect(store.pagination.page).toBe(1);
      expect(store.selectedIds).toEqual([]);
    }
  );

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
  });

  test('keeps 50 chart samples and resumes from the latest totals after charts are paused', async () => {
    const store = useClientsStore();
    data.value = page(1, 1);
    await store.refresh({ updateCharts: true });
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

    data.value!.clients[0]!.transferRx! += 100;
    await store.refresh();
    expect(store.clients![0]!.transferRxCurrent).toBe(100);
    expect(store.clients![0]!.transferRxSeries).toEqual(history);

    data.value!.clients[0]!.transferRx! += 20;
    await store.refresh({ updateCharts: true });
    expect(store.clients![0]!.transferRxCurrent).toBe(20);
    expect(store.clients![0]!.transferRxSeries[0]?.data).toHaveLength(50);
    expect(store.clients![0]!.transferRxSeries[0]?.data.at(-1)).toBe(20);
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

  test.each(['throw', 'error ref'])(
    'preserves the displayed page on fetch failure (%s) and allows retry',
    async (failure) => {
      const store = useClientsStore();
      await store.refresh();
      const displayed = page().clients;
      if (failure === 'throw') {
        refresh.mockRejectedValueOnce(new Error('Network failure'));
        await expect(store.setPage(2)).rejects.toThrow('Network failure');
      } else {
        error.value = new Error('Network failure');
        data.value = undefined;
        await store.setPage(2);
      }
      expect(store.pagination).toMatchObject({ page: 1, total: 51 });
      expect(store.clients).toMatchObject(displayed);
      expect(store.isUpdatingList).toBe(false);

      error.value = null;
      data.value = page(2);
      await store.refresh();
      expect(params.value.page).toBe(2);
      expect(store.pagination.page).toBe(2);
    }
  );

  test('keeps the newest result when polls finish out of order', async () => {
    const store = useClientsStore();
    await store.refresh();
    const request = Promise.withResolvers<undefined>();
    refresh.mockReturnValueOnce(request.promise);
    const oldPoll = store.refresh();

    data.value = page(1, 50);
    data.value.clients[0]!.name = 'Updated client';
    await store.refresh();
    data.value = page();
    request.resolve(undefined);
    await oldPoll;
    expect(store.pagination.total).toBe(50);
    expect(store.clients?.[0]?.name).toBe('Updated client');
  });

  test('retains the displayed range until a new page size loads', async () => {
    const store = useClientsStore();
    await store.refresh();
    data.value = page(2);
    await store.setPage(2);
    const request = Promise.withResolvers<undefined>();
    refresh.mockReturnValueOnce(request.promise);
    const updating = store.updateQuery({ pageSize: 10 });
    expect(params.value).toMatchObject({ page: 1, pageSize: 10 });
    expect(store.isUpdatingList).toBe(true);
    expect(store.pagination.page).toBe(2);
    expect(store.pagination.pageSize).toBe(25);
    expect(store.clients?.[0]?.id).toBe(26);
    data.value = page(1, 51, 10);
    request.resolve(undefined);
    await updating;
    expect(store.isUpdatingList).toBe(false);
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
    expect(store.hasActiveFilters).toBe(true);
    await store.clearFilters();
    expect(store.hasActiveFilters).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(store.query).toMatchObject({
      filter: undefined,
      status: 'all',
      expiry: 'all',
      sortOrder: 'createdAt:desc',
      pageSize: 50,
    });
  });
});
