<template>
  <div
    class="flex flex-wrap items-center justify-end gap-2 text-sm text-gray-500 dark:text-neutral-300"
  >
    <span>{{ $t('client.selectedCount', [selectedCount]) }}</span>
    <ClientsBulkActionDialog
      :enabled="true"
      :selected-count="selectedCount"
      @confirm="$emit('action', $event)"
    />
    <ClientsBulkActionDialog
      :enabled="false"
      :selected-count="selectedCount"
      @confirm="$emit('action', $event)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedCount: number;
}>();

defineEmits<{
  action: [enabled: boolean];
}>();
</script>
