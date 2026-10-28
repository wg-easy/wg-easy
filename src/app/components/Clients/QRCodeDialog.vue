<template>
  <BaseDialog>
    <template #trigger>
      <slot />
    </template>
    <template #title>{{ $t('clients.configuration.showQrCode') }}</template>
    <template #description>
      <div class="bg-white">
        <img
          ref="img"
          :src="qrCode"
          :alt="$t('clients.configuration.showQrCode')"
          class="mx-auto w-full max-w-72"
        />
      </div>
    </template>
    <template #actions>
      <BaseSecondaryButton
        class="flex items-center gap-2"
        :title="$t('clients.configuration.copyPng')"
        @click="copyPng"
      >
        <ClipboardCopyIcon class="size-5" />
        PNG
      </BaseSecondaryButton>
      <BaseSecondaryButton
        class="flex items-center gap-2"
        :title="$t('clients.configuration.downloadPng')"
        @click="downloadPng"
      >
        <DownloadIcon class="size-5" />
        PNG
      </BaseSecondaryButton>
      <DialogClose as-child>
        <BaseSecondaryButton>
          {{ $t('common.actions.cancel') }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ClipboardCopyIcon, DownloadIcon } from '@lucide/vue';

defineProps<{ qrCode: string }>();

const toast = useToast();
const img = useTemplateRef('img');

async function svgToPng() {
  if (!img.value || !img.value.complete || img.value.naturalWidth === 0) {
    throw new Error('image is not loaded');
  }

  const width = 1000;
  const height = 1000;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('was not able to create 2d context');
  }
  ctx.drawImage(img.value!, 0, 0, width, height);

  return new Promise<Blob>((res, rej) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return rej(new Error('was not able to create blob'));
      }
      return res(blob);
    }, 'image/png');
  });
}

async function downloadPng() {
  try {
    const blob = await svgToPng();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client-config.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('failed to download png', e);
    toast.showToast({
      type: 'error',
      message: $t('common.notifications.unknown'),
    });
  }
}

async function copyPng() {
  const blob = await svgToPng().catch((e) => {
    console.error('failed to convert svg to png', e);
    toast.showToast({
      type: 'error',
      message: $t('common.notifications.unknown'),
    });
  });
  if (!blob) {
    return;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);

    toast.showToast({
      type: 'success',
      message: $t('common.clipboard.copied'),
    });
  } catch (e) {
    console.error('failed to copy png', e);
    toast.showToast({
      type: 'error',
      message: $t('common.clipboard.failed'),
    });
  }
}
</script>
