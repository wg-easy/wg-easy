<template>
  <Label :for="id" class="font-semibold md:align-middle md:leading-10">
    {{ label }}
  </Label>
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
