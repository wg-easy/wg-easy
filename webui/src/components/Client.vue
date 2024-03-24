<template>
  <div
    v-if="client"
    class="relative overflow-hidden border-b last:border-b-0 border-gray-100 dark:border-neutral-600 border-solid"
  >
    <!-- Chart -->
    <ClientCharts :client="client" />

    <div class="relative py-3 md:py-5 px-3 z-10 flex flex-col sm:flex-row justify-between gap-3">
      <div class="flex gap-3 md:gap-4 w-full items-center">
        <ClientAvatar :client="client" />
        <ClientInfo :client="client" />
      </div>

      <div class="flex items-center justify-end">
        <ClientControls :client="client" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ClientCharts from '@/components/ClientCharts.vue';
import ClientInfo from '@/components/ClientInfo.vue';
import ClientAvatar from '@/components/ClientAvatar.vue';
import ClientControls from '@/components/ClientControls.vue';

defineProps({
  client: {},
});
</script>
