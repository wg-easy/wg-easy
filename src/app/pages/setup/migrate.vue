<template>
  <div>
    <p class="p-8 text-center text-lg">
      {{ $t('setup.messageSetupMigration') }}
    </p>
    <div>
      <Label for="migration">{{ $t('setup.migration') }}</Label>
      <input id="migration" type="file" @change="onChangeFile" />
    </div>
    <BaseButton @click="sendFile">Upload</BaseButton>
  </div>
</template>

<script lang="ts" setup>
import { FetchError } from 'ofetch';

definePageMeta({
  layout: 'setup',
});

const { t } = useI18n();

const setupStore = useSetupStore();
setupStore.setStep(5);
const backupFile = ref<null | File>(null);

function onChangeFile(evt: Event) {
  const target = evt.target as HTMLInputElement;
  const file = target.files?.[0];

  console.log('file', file);

  if (file) {
    backupFile.value = file;
    console.log('backupFile.value', backupFile.value);
  }
}

const router = useRouter();

async function sendFile() {
  if (!backupFile.value) {
    setupStore.handleError({
      title: t('setup.requirements'),
      message: t('setup.emptyFields'),
    });
    return;
  }

  try {
    const content = await readFileContent(backupFile.value);

    await setupStore.runMigration(content);
    await router.push('/setup/success');
  } catch (error) {
    if (error instanceof FetchError) {
      setupStore.handleError({
        title: t('setup.requirements'),
        message: error.data.message,
      });
    }
  }
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
}
</script>
