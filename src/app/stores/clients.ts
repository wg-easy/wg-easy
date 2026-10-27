import { defineStore } from 'pinia';

import { toLocalClients, type LocalClient } from '../utils/client';

import type {
  ClientExpiryFilter,
  ClientSortField,
  ClientSortOrder,
  ClientStatusFilter,
} from '#shared/utils/clientList';

type ClientListQuery = {
  filter?: string;
  status: ClientStatusFilter;
  expiry: ClientExpiryFilter;
  sortOrder: ClientSortOrder;
  page: number;
  pageSize: number;
};

export const useClientsStore = defineStore('Clients', () => {
  const query = ref<ClientListQuery>({
    status: 'all',
    expiry: 'all',
    sortOrder: 'name:asc',
    page: 1,
    pageSize: 25,
  });
  // Keep the displayed page intact while a different query is loading.
  const clients = ref<LocalClient[] | null>(null);
  const pagination = ref({ page: 1, pageSize: 25, total: 0 });
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(pagination.value.total / pagination.value.pageSize))
  );
  const hasActiveFilters = computed(
    () =>
      Boolean(query.value.filter) ||
      query.value.status !== 'all' ||
      query.value.expiry !== 'all'
  );
  const searchParams = computed(() => {
    const { sortOrder, ...params } = query.value;
    const [sortBy, sort] = sortOrder.split(':') as [
      ClientSortField,
      'asc' | 'desc',
    ];
    return { ...params, sortBy, sort };
  });
  const {
    data,
    refresh: fetchClients,
    error,
  } = useFetch('/api/client', {
    key: 'clients',
    method: 'get',
    params: searchParams,
    watch: false,
  });

  const isUpdatingList = ref(false);
  let refreshId = 0;
  let appliedQuery: ClientListQuery | undefined;

  async function refresh({ updateCharts = false } = {}) {
    const id = ++refreshId;
    const requestedQuery = query.value;
    isUpdatingList.value = requestedQuery !== appliedQuery;
    try {
      await fetchClients();
      // A poll or navigation may have superseded this request.
      if (
        id !== refreshId ||
        requestedQuery !== query.value ||
        error.value ||
        !data.value
      )
        return;

      const result = data.value;
      clients.value = toLocalClients(
        result.clients,
        clients.value,
        updateCharts
      );
      pagination.value = {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      };
      if (query.value.page !== result.page) {
        query.value = { ...query.value, page: result.page };
      }
      appliedQuery = query.value;
    } finally {
      if (id === refreshId) isUpdatingList.value = false;
    }
  }

  async function setPage(page: number) {
    if (!Number.isInteger(page) || isUpdatingList.value) return;
    const nextPage = Math.min(Math.max(1, page), totalPages.value);
    if (nextPage === pagination.value.page) return;
    query.value = { ...query.value, page: nextPage };
    await refresh();
  }

  function updateQuery(updates: Partial<Omit<ClientListQuery, 'page'>>) {
    const nextQuery = { ...query.value, ...updates, page: 1 };
    if (
      !Number.isInteger(nextQuery.pageSize) ||
      nextQuery.pageSize < 1 ||
      nextQuery.pageSize > 100
    )
      return;
    nextQuery.filter = nextQuery.filter?.trim() || undefined;
    query.value = nextQuery;
    return refresh().catch(console.error);
  }

  function clearFilters() {
    return updateQuery({ filter: undefined, status: 'all', expiry: 'all' });
  }

  return {
    clients,
    query,
    pagination,
    totalPages,
    hasActiveFilters,
    isUpdatingList,
    error,
    refresh,
    setPage,
    updateQuery,
    clearFilters,
  };
});
