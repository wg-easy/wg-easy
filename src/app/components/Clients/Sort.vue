<template>
  <ClientsSelect
    :model-value="clientsStore.query.sortOrder"
    :label="$t('ui.sortBy')"
    :options="options"
    @update:model-value="clientsStore.updateQuery({ sortOrder: $event })"
  />
</template>

<script setup lang="ts">
import type { ClientSortOrder } from '#shared/utils/clientList';

const clientsStore = useClientsStore();
const { t } = useI18n();
const options = computed<{ value: ClientSortOrder; label: string }[]>(() => [
  { value: 'name:asc', label: t('ui.sortOptions.nameAsc') },
  { value: 'name:desc', label: t('ui.sortOptions.nameDesc') },
  { value: 'createdAt:desc', label: t('ui.sortOptions.newest') },
  { value: 'createdAt:asc', label: t('ui.sortOptions.oldest') },
  { value: 'ipv4Address:asc', label: t('ui.sortOptions.addressAsc') },
  { value: 'ipv4Address:desc', label: t('ui.sortOptions.addressDesc') },
  { value: 'expiresAt:asc', label: t('ui.sortOptions.expiryAsc') },
  { value: 'expiresAt:desc', label: t('ui.sortOptions.expiryDesc') },
]);
</script>
