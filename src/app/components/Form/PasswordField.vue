<template>
  <FormLabel :for="id">
    {{ label }}
  </FormLabel>
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="password"
    :autocomplete="autocomplete"
  />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; autocomplete: string }>();

const data = defineModel<string>();
</script>
