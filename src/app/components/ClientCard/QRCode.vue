<template>
  <ClientsQRCodeDialog :qr-code="`/api/client/${client.id}/qrcode.svg`"
    ><span class="icon-button" :title="$t('client.showQR')"
      ><IconsQRCode class="size-4" /><span class="sr-only">{{
        $t('client.showQR')
      }}</span></span
    ></ClientsQRCodeDialog
  >
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
