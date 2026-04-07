<template>
  <RLabel :for="props.for" class="md:leading-[2.75rem]">
    <slot />
  </RLabel>
</template>

<script lang="ts" setup>
import { Label as RLabel } from 'radix-vue';

const props = defineProps<{ for: string }>();
</script>
