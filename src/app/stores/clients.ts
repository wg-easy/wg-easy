import { defineStore } from 'pinia';

import { toLocalClients, type LocalClient } from '../utils/client';

import type { ClientBulkAction } from '#shared/utils/clientBulk';
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
    query: searchParams,
    watch: false,
  });

  const isUpdatingList = ref(false);
  const isApplyingBulk = ref(false);
  const selectedIds = ref<number[]>([]);
  const selectedClients = computed(() =>
    (clients.value ?? []).filter((client) =>
      selectedIds.value.includes(client.id)
    )
  );
  const pageSelection = computed<boolean | 'indeterminate'>(() => {
    if (!selectedClients.value.length) return false;
    return selectedClients.value.length === clients.value?.length
      ? true
      : 'indeterminate';
  });

  function clearSelection() {
    selectedIds.value = [];
  }

  function selectClient(id: number, selected: boolean) {
    if (isUpdatingList.value || isApplyingBulk.value) return;
    if (!clients.value?.some((client) => client.id === id)) return;
    selectedIds.value = selected
      ? [...new Set([...selectedIds.value, id])]
      : selectedIds.value.filter((selectedId) => selectedId !== id);
  }

  function selectPage(selected: boolean) {
    if (isUpdatingList.value || isApplyingBulk.value) return;
    selectedIds.value = selected
      ? (clients.value ?? []).map((client) => client.id)
      : [];
  }

  let refreshId = 0;
  let appliedQuery: ClientListQuery | undefined;

  async function refresh({ updateCharts = false } = {}) {
    if (isApplyingBulk.value) return;
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
      const remainingIds = selectedIds.value.filter((id) =>
        result.clients.some((client) => client.id === id)
      );
      if (remainingIds.length !== selectedIds.value.length) {
        selectedIds.value = remainingIds;
      }
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
    clearSelection();
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
    clearSelection();
    query.value = nextQuery;
    return refresh().catch(console.error);
  }

  function clearFilters() {
    return updateQuery({ filter: undefined, status: 'all', expiry: 'all' });
  }

  async function applyBulkAction(action: ClientBulkAction) {
    if (
      isApplyingBulk.value ||
      isUpdatingList.value ||
      !selectedIds.value.length
    )
      return false;

    const clientIds = [...selectedIds.value];
    isApplyingBulk.value = true;
    // Ignore any poll that started before this mutation.
    ++refreshId;
    try {
      await $fetch('/api/client/bulk', {
        method: 'post',
        body: { action, clientIds },
      });
      clearSelection();
      return true;
    } finally {
      isApplyingBulk.value = false;
      await refresh().catch(console.error);
    }
  }

  return {
    clients,
    query,
    pagination,
    totalPages,
    hasActiveFilters,
    isUpdatingList,
    isApplyingBulk,
    selectedIds,
    selectedClients,
    pageSelection,
    selectClient,
    selectPage,
    clearSelection,
    applyBulkAction,
    error,
    refresh,
    setPage,
    updateQuery,
    clearFilters,
  };
});
