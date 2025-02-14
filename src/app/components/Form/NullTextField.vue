<template>
  <div class="flex items-center">
    <Label :for="id" class="font-semibold md:align-middle md:leading-10">
      {{ label }}
    </Label>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="text"
    :autcomplete="autocomplete"
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
