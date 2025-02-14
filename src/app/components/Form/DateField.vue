<template>
  <FormLabel :for="id">
    {{ label }}
  </FormLabel>
  <BaseInput :id="id" v-model="data" :name="id" type="date" />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string }>();

const data = defineModel<string | null>({
  set(value) {
    const temp = value?.trim() ?? null;
    if (temp === '') {
      return null;
    }
    return temp;
  },
});
</script>
