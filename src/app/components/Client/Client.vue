<template>
  <ClientCharts :client="client" />
  <div
    class="relative py-3 md:py-5 px-3 z-10 flex flex-col sm:flex-row justify-between gap-3"
  >
    <div class="flex gap-3 md:gap-4 w-full items-center">
      <ClientAvatar :client="client" />
      <!-- Name & Info -->
      <div class="flex flex-col xxs:flex-row w-full gap-2">
        <div class="flex flex-col flex-grow gap-1">
          <ClientName :client="client" />
          <div
            class="block md:inline-block pb-1 md:pb-0 text-gray-500 dark:text-neutral-400 text-xs"
          >
            <ClientAddress4 :client="client" />
            <ClientInlineTransfer
              v-if="!globalStore.features.trafficStats.enabled"
              :client="client"
            />
            <ClientLastSeen :client="client" />
          </div>
          <ClientOneTimeLink :client="client" />
          <ClientExpireDate :client="client" />
        </div>

        <!-- Info -->
        <div
          v-if="globalStore.features.trafficStats.enabled"
          class="flex gap-2 items-center shrink-0 text-gray-400 dark:text-neutral-400 text-xs mt-px justify-end"
        >
          <ClientTransfer :client="client" />
        </div>
      </div>
      <!-- </div> -->
      <!-- <div class="flex flex-grow items-center"> -->
    </div>

    <div class="flex items-center justify-end">
      <div
        class="text-gray-400 dark:text-neutral-400 flex gap-1 items-center justify-between"
      >
        <ClientSwitch :client="client" />
        <ClientQRCode :client="client" />
        <ClientConfig :client="client" />
        <ClientOneTimeLinkBtn :client="client" />
        <ClientDelete :client="client" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();

const globalStore = useGlobalStore();
</script>
