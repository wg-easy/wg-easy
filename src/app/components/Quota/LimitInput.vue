<template>
  <label class="space-y-1">
    <span class="text-sm font-medium">{{ label }}</span>
    <span class="flex">
      <input
        v-model.number="value"
        type="number"
        min="0.000001"
        step="any"
        required
        class="min-w-0 flex-1 rounded-l border-2 border-r-0 border-gray-100 bg-white text-gray-700 focus:border-red-800 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
      />
      <select
        v-model="unit"
        class="rounded-r border-2 border-gray-100 bg-gray-50 text-sm text-gray-700 focus:border-red-800 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-600 dark:text-neutral-200"
      >
        <option value="MB">MB</option>
        <option value="GB">GB</option>
        <option value="TB">TB</option>
      </select>
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
const value = defineModel<number>('value', { required: true });
const unit = defineModel<'MB' | 'GB' | 'TB'>('unit', { required: true });
</script>
