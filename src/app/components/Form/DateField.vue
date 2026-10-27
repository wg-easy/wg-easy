<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <InfoIcon class="size-4" />
    </BaseTooltip>
  </div>
  <BaseInput
    :id="id"
    :model-value="formattedDate"
    :name="id"
    type="datetime-local"
    max="9999-12-31T23:59"
    @update:model-value="updateDate"
  />
</template>

<script lang="ts" setup>
import { InfoIcon } from '@lucide/vue';

defineProps<{ id: string; label: string; description?: string }>();

const data = defineModel<string | null>();
const mounted = useMounted();

const formattedDate = computed(() => {
  // The browser's timezone is only available after hydration.
  if (!mounted.value || !data.value) return '';

  // Date-only values retain their original midnight-UTC expiration.
  const date = new Date(data.value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
});

const updateDate = (value: unknown) => {
  if (typeof value !== 'string' && value !== null) {
    return;
  }

  const temp = value?.trim() ?? null;

  if (temp === '' || temp === null) {
    data.value = null;
  } else {
    const date = new Date(temp);
    if (!Number.isNaN(date.getTime())) {
      data.value = date.toISOString();
    }
  }
};
</script>
