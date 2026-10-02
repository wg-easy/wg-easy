<template>
  <div>
    <div
      class="flex min-h-14 items-center gap-3 border-b border-solid border-gray-100 px-3 py-2 dark:border-neutral-600"
    >
      <label class="flex h-10 w-10 shrink-0 items-center justify-center">
        <input
          ref="masterCheckbox"
          :checked="selectionState === 'all'"
          type="checkbox"
          class="h-5 w-5 cursor-pointer accent-red-800"
          :aria-label="$t('client.selectAll')"
          @change="toggleAllSelection"
        />
      </label>
      <ClientsBulkActions
        v-if="selectedCount > 0"
        :selected-count="selectedCount"
        :state="selectedClientEnabledState"
        @action="bulkToggle"
      />
      <span v-else class="text-sm text-gray-500 dark:text-neutral-400">
        {{ $t('client.selectAll') }}
      </span>
    </div>

    <div
      v-for="client in clientsStore.clients"
      :key="client.id"
      class="relative overflow-hidden border-b border-solid border-gray-100 last:border-b-0 dark:border-neutral-600"
    >
      <ClientCard
        :client="client"
        :selected="selectedClientIds.has(client.id)"
        :selection-mode="selectedCount > 0"
        @toggle-selection="toggleClientSelection(client.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  getSelectedClientEnabledState,
  getSelectionState,
  toggleClientSelection as toggleSelection,
  toggleVisibleClientSelection,
} from '../../utils/clientSelection';

const clientsStore = useClientsStore();
const selectedClientIds = ref<Set<number>>(new Set());
const masterCheckbox = ref<HTMLInputElement>();

const visibleIds = computed(
  () => clientsStore.clients?.map((client) => client.id) ?? []
);
const selectionState = computed(() =>
  getSelectionState(selectedClientIds.value, visibleIds.value)
);
const selectedCount = computed(() => selectedClientIds.value.size);
const selectedClientEnabledState = computed(() =>
  getSelectedClientEnabledState(
    selectedClientIds.value,
    clientsStore.clients ?? []
  )
);

watchEffect(() => {
  if (masterCheckbox.value) {
    masterCheckbox.value.indeterminate = selectionState.value === 'partial';
  }
});

watch(visibleIds, (ids) => {
  const visibleIdSet = new Set(ids);
  selectedClientIds.value = new Set(
    [...selectedClientIds.value].filter((id) => visibleIdSet.has(id))
  );
});

function toggleAllSelection() {
  selectedClientIds.value = toggleVisibleClientSelection(
    selectedClientIds.value,
    visibleIds.value
  );
}

function toggleClientSelection(clientId: number) {
  selectedClientIds.value = toggleSelection(selectedClientIds.value, clientId);
}

const submitBulkToggle = useSubmit(
  (data) =>
    $fetch('/api/client/bulk/toggle', {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success) => {
      if (success) {
        await clientsStore.refresh();
        selectedClientIds.value = new Set();
      }
    },
    noSuccessToast: true,
  }
);

function bulkToggle(enabled: boolean) {
  return submitBulkToggle({
    clientIds: [...selectedClientIds.value],
    enabled,
  });
}
</script>
