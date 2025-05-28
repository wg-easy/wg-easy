<template>
  <div class="flex flex-col items-center">
    <p class="text-center text-lg">
      {{ $t('setup.setupMigrationDesc') }}
    </p>
    <div class="mt-8 flex gap-3">
      <Label for="migration">{{ $t('setup.migration') }}</Label>
      <input id="migration" type="file" @change="onChangeFile" />
    </div>
    <div class="mt-4">
      <BasePrimaryButton @click="submit">
        {{ $t('setup.upload') }}
      </BasePrimaryButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(5);

const backupFile = ref<null | File>(null);

function onChangeFile(evt: Event) {
  const target = evt.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    backupFile.value = file;
    console.log('selected file', backupFile.value);
  }
}

const _submit = useSubmit(
  '/api/setup/migrate',
  {
    method: 'post',
  },
  {
    revert: async (success) => {
      if (success) {
        await navigateTo('/setup/success');
      }
    },
    noSuccessToast: true,
  }
);

async function submit() {
  if (!backupFile.value) {
    return;
  }
  const content = await readFileContent(backupFile.value);
  return _submit({ file: content });
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
