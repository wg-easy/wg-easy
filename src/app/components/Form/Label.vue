<template>
  <RLabel :for="id" class="md:align-middle md:leading-10"><slot /></RLabel>
</template>

<script lang="ts" setup>
import { Label as RLabel } from 'radix-vue';

defineProps<{ id: string }>();
</script>
