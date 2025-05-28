<template>
  <input
    :value="label"
    :type="type ?? 'button'"
    class="col-span-2 rounded-lg border-2 border-red-800 bg-red-800 py-2 text-white hover:border-red-600 hover:bg-red-600 focus:border-red-800 focus:outline-0 focus:ring-0"
  />
</template>

<script lang="ts" setup>
import type { InputTypeHTMLAttribute } from 'vue';

defineProps<{
  label: string;
  type?: InputTypeHTMLAttribute;
}>();
</script>
