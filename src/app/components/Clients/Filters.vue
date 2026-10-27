<template>
  <div class="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
    <ClientsSelect
      :model-value="clientsStore.query.status"
      :label="$t('ui.filterStatus')"
      :options="statusOptions"
      class="sm:w-40"
      @update:model-value="clientsStore.updateQuery({ status: $event })"
    />
    <ClientsSelect
      :model-value="clientsStore.query.expiry"
      :label="$t('ui.filterExpiry')"
      :options="expiryOptions"
      class="sm:w-48"
      @update:model-value="clientsStore.updateQuery({ expiry: $event })"
    />
    <ClientsSort class="col-span-2 sm:ml-auto sm:w-56" />
  </div>
</template>

<script setup lang="ts">
import {
  clientExpiryFilters,
  clientStatusFilters,
} from '#shared/utils/clientList';

const clientsStore = useClientsStore();
const { t } = useI18n();
const statusOptions = computed(() =>
  clientStatusFilters.map((value) => ({
    value,
    label: t(`ui.statusOptions.${value}`),
  }))
);
const expiryOptions = computed(() =>
  clientExpiryFilters.map((value) => ({
    value,
    label: t(`ui.expiryOptions.${value}`),
  }))
);
</script>
