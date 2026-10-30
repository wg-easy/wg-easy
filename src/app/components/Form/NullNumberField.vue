<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <BaseInput :id="id" v-model.number="data" :name="id" type="number" />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();

const data = defineModel<number | null>({
  set(value) {
    const temp = value ?? null;
    if (temp === 0) {
      return null;
    }
    if ((temp as string | null) === '') {
      return null;
    }
    return temp;
  },
});
</script>
