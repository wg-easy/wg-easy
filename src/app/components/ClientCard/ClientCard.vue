<template>
  <ClientCardCharts :client="client" />
  <div
    class="relative z-10 flex flex-col justify-between gap-3 px-3 py-3 sm:flex-row md:py-5"
  >
    <div class="flex w-full items-center gap-3 md:gap-4">
      <ClientCardAvatar :client="client" />
      <div class="flex w-full flex-col gap-2 xxs:flex-row">
        <div class="flex flex-grow flex-col gap-1">
          <ClientCardName :client="client" />
          <div
            class="flex flex-col pb-1 text-xs text-gray-500 md:inline-block md:pb-0 dark:text-neutral-400"
          >
            <div>
              <ClientCardAddress :client="client" />
            </div>
            <div>
              <ClientCardLastSeen :client="client" />
            </div>
          </div>
          <ClientCardOneTimeLink :client="client" />
          <ClientCardExpireDate :client="client" />
        </div>

        <div
          class="mt-px flex shrink-0 items-center justify-end gap-2 text-xs text-gray-400 dark:text-neutral-400"
        >
          <ClientCardTransfer :client="client" />
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end">
      <div
        class="flex items-center justify-between gap-1 text-gray-400 dark:text-neutral-400"
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
</script>
