<template>
  <div class="flex items-center">
    <Label :for="id" class="font-semibold md:align-middle md:leading-10">
      {{ label }}
    </Label>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <input
    :id="id"
    v-model.trim="data"
    :name="id"
    type="text"
    class="rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
  />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();

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
