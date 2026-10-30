<template>
  <ClientsSelect
    :model-value="clientsStore.query.sortOrder"
    :label="$t('clients.sort.label')"
    :options="options"
    @update:model-value="clientsStore.updateQuery({ sortOrder: $event })"
  />
</template>

<script setup lang="ts">
import type { ClientSortOrder } from '#shared/utils/clientList';

const clientsStore = useClientsStore();
const { t } = useI18n();
const options = computed<{ value: ClientSortOrder; label: string }[]>(() => [
  { value: 'name:asc', label: t('clients.sort.options.nameAsc') },
  { value: 'name:desc', label: t('clients.sort.options.nameDesc') },
  { value: 'createdAt:desc', label: t('clients.sort.options.newest') },
  { value: 'createdAt:asc', label: t('clients.sort.options.oldest') },
  { value: 'ipv4Address:asc', label: t('clients.sort.options.addressAsc') },
  { value: 'ipv4Address:desc', label: t('clients.sort.options.addressDesc') },
  { value: 'expiresAt:asc', label: t('clients.sort.options.expiryAsc') },
  { value: 'expiresAt:desc', label: t('clients.sort.options.expiryDesc') },
]);
</script>
