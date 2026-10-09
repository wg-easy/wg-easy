<template>
  <article
    class="surface group p-4 transition-colors hover:border-subtle/50 sm:p-5"
    :class="{ 'bg-surface/60': !client.enabled }"
  >
    <div
      class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto]"
    >
      <div class="flex min-w-0 items-start gap-3.5">
        <ClientCardAvatar :client="client" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <ClientCardName :client="client" /><span
              class="inline-flex items-center gap-1.5 text-[11px]"
              :class="connected ? 'text-success' : 'text-subtle'"
              ><span class="size-1.5 rounded-full bg-current" />{{
                $t(
                  !client.enabled
                    ? 'ui.disabled'
                    : connected
                      ? 'ui.online'
                      : 'ui.offline'
                )
              }}</span
            >
          </div>
          <ClientCardAddress :client="client" />
          <div
            class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle"
          >
            <ClientCardLastSeen :client="client" /><span aria-hidden="true"
              >·</span
            ><ClientCardExpireDate :client="client" />
          </div>
        </div>
      </div>
      <div
        class="col-span-2 flex min-w-0 items-center justify-between gap-3 border-t border-line pt-4 lg:col-span-1 lg:border-0 lg:pt-0"
      >
        <ClientCardTransfer :client="client" />
        <ClientCardCharts v-if="globalStore.uiShowCharts" :client="client" />
      </div>
      <div
        class="col-span-2 flex items-center justify-between gap-4 border-t border-line pt-4 lg:col-span-1 lg:flex-col lg:items-end lg:gap-3 lg:border-0 lg:pt-0"
      >
        <label class="flex items-center gap-2 text-[11px] text-subtle"
          ><ClientCardSwitch :client="client" /><span>{{
            $t('client.enabled')
          }}</span></label
        >
        <div class="flex gap-1.5">
          <ClientCardEdit :client="client" /><ClientCardQRCode
            :client="client"
          /><ClientCardConfig :client="client" /><ClientCardOneTimeLinkBtn
            :client="client"
          />
        </div>
      </div>
    </div>
    <ClientCardOneTimeLink :client="client" />
  </article>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();
const globalStore = useGlobalStore();
const connected = computed(
  () =>
    props.client.enabled &&
    isPeerConnected({
      latestHandshakeAt: props.client.latestHandshakeAt
        ? new Date(props.client.latestHandshakeAt)
        : null,
    })
);
</script>
