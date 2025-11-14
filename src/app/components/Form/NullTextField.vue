<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
    <BaseTooltip v-if="overridden" text="This field is overridden by an environment variable">
      <IconsWarning class="size-4 ml-1 text-amber-500" />
    </BaseTooltip>
  </div>
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="text"
    :autocomplete="autocomplete"
    :placeholder="placeholder"
  />
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  autocomplete?: string;
  placeholder?: string;
  overridden?: boolean;
}>();

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
