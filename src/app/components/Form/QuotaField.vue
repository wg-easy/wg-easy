<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <div
    class="flex overflow-hidden rounded-lg border-2 border-gray-100 dark:border-neutral-800"
  >
    <BaseInput
      :id="id"
      v-model.number="quotaGiB"
      :max="maximumGiB"
      :min="minimumGiB"
      :name="id"
      step="any"
      type="number"
      class="w-full !border-0"
    />
    <div
      class="flex h-full items-center bg-neutral-200 px-4 dark:bg-neutral-800"
    >
      <span>GiB</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();

const quotaBytes = defineModel<number | null>({ required: true });
const minimumGiB = quotaBytesToGiB(1)!;
const maximumGiB = quotaBytesToGiB(Number.MAX_SAFE_INTEGER)!;

const quotaGiB = computed<number | null>({
  get: () => quotaBytesToGiB(quotaBytes.value),
  set: (value) => {
    const normalized = (value as number | string | null) === '' ? null : value;
    quotaBytes.value = quotaGiBToBytes(normalized);
  },
});
</script>
