<template>
  <Label :for="id" class="font-semibold md:align-middle md:leading-10">
    {{ label }}
  </Label>
  <BaseSwitch :id="id" v-model="data" />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string }>();
const data = defineModel<boolean>();
</script>
