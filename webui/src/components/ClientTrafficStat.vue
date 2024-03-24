<template>
  <div class="flex gap-2 items-center shrink-0 text-gray-400 dark:text-neutral-400 text-xs mt-px justify-end">
    <div class="min-w-20 md:min-w-24">
      <span class="flex gap-1" :title="$t('totalDownload') + bytes(transferData)">
        <IconTX v-if="type === 'tx'" />
        <IconRX v-if="type === 'rx'" />
        <div>
          <span class="text-gray-700 dark:text-neutral-200">{{ bytes(transferDataCurrent) }}/s</span>
          <!-- Total -->
          <br /><span class="font-regular" style="font-size: 0.85em">{{ bytes(transferData) }}</span>
        </div>
      </span>
    </div>
  </div>
</template>

<script setup>
import { useBytes } from '@/composables/useBytes';

import IconRX from '@/components/icons/IconRX.vue';
import IconTX from '@/components/icons/IconTX.vue';

const { bytes } = useBytes();

defineProps({
  transferData: {
    type: Object,
    default: null,
  },
  transferDataCurrent: {
    type: Object,
    default: null,
  },
  type: {
    type: String,
    default: '',
  },
});
</script>
