<template>
  <input
    :value="label"
    :type="type ?? 'button'"
    class="col-span-2 rounded-lg border-2 border-gray-100 py-2 text-gray-500 hover:border-red-800 hover:bg-red-800 hover:text-white focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
  />
</template>

<script lang="ts" setup>
import type { InputTypeHTMLAttribute } from 'vue';

defineProps<{
  label: string;
  type?: InputTypeHTMLAttribute;
}>();
</script>
