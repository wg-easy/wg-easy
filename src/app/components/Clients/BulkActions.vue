<template>
  <div
    class="flex items-center gap-3 text-sm text-gray-500 dark:text-neutral-300"
  >
    <ClientsBulkActionDialog
      :selected-count="selectedCount"
      :state="state"
      @confirm="$emit('action', $event)"
    />
    <span>{{ $t('client.selectedCount', [selectedCount]) }}</span>
  </div>
</template>

<script setup lang="ts">
import type { SelectedClientEnabledState } from '../../utils/clientSelection';

defineProps<{
  selectedCount: number;
  state: SelectedClientEnabledState;
}>();

defineEmits<{
  action: [enabled: boolean];
}>();
</script>
