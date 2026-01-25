<template>
  <BaseDialog>
    <template #trigger>
      <slot />
    </template>
    <template #description>
      <div class="bg-white">
        <img :src="useAmnezia ? `${qrCode}?type=amnezia-vpn` : qrCode" />
      </div>
    </template>
    <template #actions>
      <div class="flex items-center justify-left gap-3 mr-auto">
        <span class="text-sm dark:text-neutral-200">
          {{ $t('client.amneziaVpn') }}
        </span>
        <BaseSwitch 
          v-model="useAmnezia"
          :title="
            useAmnezia ? $t('client.showWireGuardQR') : $t('client.showAmneziaVpnQR')
          "
        />
      </div>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineProps<{ qrCode: string }>();

const useAmnezia = ref(false);
</script>
