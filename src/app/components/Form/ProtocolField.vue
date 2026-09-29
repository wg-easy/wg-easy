<template>
  <label class="col-span-full mb-4 flex flex-col gap-2">
    <span>{{ $t('vpn.protocol') }}</span>
    <select
      v-model="model"
      class="rounded-md border-gray-300 bg-white dark:border-neutral-600 dark:bg-neutral-800"
    >
      <option value="awg">AmneziaWG 3.1</option>
      <option value="wg">WireGuard</option>
    </select>
  </label>
</template>

<script setup lang="ts">
const model = defineModel<'awg' | 'wg'>({ required: true });
</script>
