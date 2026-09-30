<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <BaseInput
    :id="id"
    :model-value="formattedDate"
    :name="id"
    type="date"
    max="9999-12-31"
    @update:model-value="updateDate"
  />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();

const data = defineModel<string | null>();

const date = ref(data);

const formattedDate = computed(() => {
  return date.value ? date.value.split('T')[0] : '';
});

const updateDate = (value: unknown) => {
  if (typeof value !== 'string' && value !== null) {
    return;
  }

  const temp = value?.trim() ?? null;

  if (temp === '' || temp === null) {
    date.value = null;
  } else {
    date.value = new Date(temp).toISOString();
  }
};
</script>
