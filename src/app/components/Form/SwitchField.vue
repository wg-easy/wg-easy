<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <div class="my-auto">
    <BaseSwitch :id="id" v-model="data" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();
const data = defineModel<boolean>();
</script>
