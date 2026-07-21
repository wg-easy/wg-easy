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
      :max="maximumGiB"
      :min="minimumGiB"
      :model-value="quotaInput"
      :name="id"
      step="any"
      type="number"
      class="w-full !border-0"
      @blur="onBlur"
      @focus="isFocused = true"
      @update:model-value="updateQuotaInput"
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

const isFocused = ref(false);
const quotaInput = ref(quotaBytesToGiBInput(quotaBytes.value));

watch(quotaBytes, (value) => {
  if (!isFocused.value) {
    quotaInput.value = quotaBytesToGiBInput(value);
  }
});

function updateQuotaInput(value: unknown) {
  const nextValue = typeof value === 'string' ? value : String(value ?? '');
  quotaInput.value = nextValue;

  const nextBytes = quotaGiBInputToBytes(nextValue);
  if (nextBytes !== undefined) {
    quotaBytes.value = nextBytes;
  }
}

function onBlur() {
  isFocused.value = false;
  quotaInput.value = quotaBytesToGiBInput(quotaBytes.value);
}
</script>
