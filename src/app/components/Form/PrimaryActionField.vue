<template>
  <input
    :value="label"
    :type="type ?? 'button'"
    class="ui-button ui-button-primary col-span-2"
  />
</template>

<script lang="ts" setup>
import type { InputTypeHTMLAttribute } from 'vue';

defineProps<{
  label: string;
  type?: InputTypeHTMLAttribute;
}>();
</script>
