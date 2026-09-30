<template>
  <BaseDialog>
    <template #trigger>
      <slot />
    </template>
    <template #description>
      <div class="bg-white">
        <img ref="img" :src="qrCode" />
      </div>
    </template>
    <template #actions>
      <BaseSecondaryButton
        class="flex items-center gap-2"
        :title="$t('client.copyPng')"
        @click="copyPng"
      >
        <IconsCopy class="size-5" /> PNG
      </BaseSecondaryButton>
      <BaseSecondaryButton
        class="flex items-center gap-2"
        :title="$t('client.downloadPng')"
        @click="downloadPng"
      >
        <IconsDownload class="size-5" /> PNG
      </BaseSecondaryButton>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
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
      message: $t('toast.unknown'),
    });
  }
}

async function copyPng() {
  const blob = await svgToPng().catch((e) => {
    console.error('failed to convert svg to png', e);
    toast.showToast({
      type: 'error',
      message: $t('toast.unknown'),
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
      message: $t('copy.copied'),
    });
  } catch (e) {
    console.error('failed to copy png', e);
    toast.showToast({
      type: 'error',
      message: $t('copy.failed'),
    });
  }
}
</script>
