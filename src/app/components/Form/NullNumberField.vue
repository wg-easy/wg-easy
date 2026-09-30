<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
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
