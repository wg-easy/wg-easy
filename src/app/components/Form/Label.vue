<template>
  <RLabel :for="props.for" class="md:align-middle md:leading-10"
    ><slot
  /></RLabel>
</template>

<script lang="ts" setup>
import { Label as RLabel } from 'radix-vue';

const props = defineProps<{ for: string }>();
</script>
