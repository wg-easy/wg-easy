<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <span :id="id" class="flex flex-col justify-center">{{ data }}</span>
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  data?: string;
}>();
</script>
