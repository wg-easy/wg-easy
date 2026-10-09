<template>
  <div class="flex flex-col items-center">
    <p class="text-sm leading-relaxed text-muted">
      {{ $t('setup.setupMigrationDesc') }}
    </p>
    <div class="mt-8 flex w-full flex-col gap-3">
      <Label for="migration">{{ $t('setup.migration') }}</Label>
      <input
        id="migration"
        class="ui-input file:mr-3 file:rounded file:border-0 file:bg-surface-raised file:px-3 file:py-1 file:text-muted"
        type="file"
        @change="onChangeFile"
      />
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
  (data) =>
    $fetch('/api/setup/migrate', {
      method: 'post',
      body: data,
    }),
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
