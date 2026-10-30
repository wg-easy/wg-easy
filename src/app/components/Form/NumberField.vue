<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <BaseInput :id="id" v-model.number="data" :name="id" type="number" />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();

const data = defineModel<number>();
</script>
