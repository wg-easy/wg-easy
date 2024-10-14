<template>
  <ClientCardCharts :client="client" />
  <div
    class="relative py-3 md:py-5 px-3 z-10 flex flex-col sm:flex-row justify-between gap-3"
  >
    <div class="flex gap-3 md:gap-4 w-full items-center">
      <ClientCardAvatar :client="client" />
      <!-- Name & Info -->
      <div class="flex flex-col xxs:flex-row w-full gap-2">
        <div class="flex flex-col flex-grow gap-1">
          <ClientCardName :client="client" />
          <div
            class="block md:inline-block pb-1 md:pb-0 text-gray-500 dark:text-neutral-400 text-xs"
          >
            <ClientCardAddress4 :client="client" />
            <ClientCardInlineTransfer
              v-if="!globalStore.statistics.enabled"
              :client="client"
            />
            <ClientCardLastSeen :client="client" />
          </div>
          <ClientCardOneTimeLink :client="client" />
          <ClientCardExpireDate :client="client" />
        </div>

        <!-- Info -->
        <div
          v-if="globalStore.statistics.enabled"
          class="flex gap-2 items-center shrink-0 text-gray-400 dark:text-neutral-400 text-xs mt-px justify-end"
        >
          <ClientCardTransfer :client="client" />
        </div>
      </div>
      <!-- </div> -->
      <!-- <div class="flex flex-grow items-center"> -->
    </div>

    <div class="flex items-center justify-end">
      <div
        class="text-gray-400 dark:text-neutral-400 flex gap-1 items-center justify-between"
      >
        <ClientCardSwitch :client="client" />
        <ClientCardEdit :client="client" />
        <ClientCardQRCode :client="client" />
        <ClientCardConfig :client="client" />
        <ClientCardOneTimeLinkBtn :client="client" />
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
