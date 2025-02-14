<template>
  <Label :for="id" class="font-semibold md:align-middle md:leading-10">
    {{ label }}
  </Label>
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
