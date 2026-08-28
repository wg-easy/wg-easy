<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <div class="my-auto flex items-center gap-2">
    <BaseSwitch :id="id" v-model="internalValue" />
    <button
      v-if="data !== null"
      type="button"
      class="text-xs text-gray-400 hover:text-gray-200"
      @click="data = null"
    >
      {{ $t('generic.reset') || 'Reset' }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

defineProps<{ id: string; label: string; description?: string }>();
const data = defineModel<boolean | null>();

const internalValue = computed({
  get() {
    return data.value === true;
  },
  set(val: boolean) {
    data.value = val;
  },
});
</script>
