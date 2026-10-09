<template>
  <RLabel :for="props.for" class="text-sm font-medium text-muted sm:leading-10">
    <slot />
  </RLabel>
</template>

<script lang="ts" setup>
import { Label as RLabel } from 'reka-ui';

const props = defineProps<{ for: string }>();
</script>
