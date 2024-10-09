<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupMigration') }}
    </p>
    <div>
      <Label for="migration">{{ $t('setup.migration') }}</Label>
      <input id="migration" type="file" @change="onChangeFile" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const setupStore = useSetupStore();
const { t } = useI18n();

const emit = defineEmits(['validated']);

const props = defineProps<{
  next: boolean;
}>();

const next = toRef(props, 'next');
const backupFile = ref<null | File>(null);

watch(next, async (newVal) => {
  if (newVal) {
    await sendFile();
  }
});

function onChangeFile(evt: Event) {
  const target = evt.target as HTMLInputElement;
  const file = target.files?.[0];

  console.log('file', file);

  if (file) {
    backupFile.value = file;
    console.log('backupFile.value', backupFile.value);
  }
}

async function sendFile() {
  if (!backupFile.value) {
    emit('validated', {
      title: t('setup.requirements'),
      message: t('setup.emptyFields'),
    });
    return;
  }

  try {
    await setupStore.runMigration(backupFile.value);
    emit('validated', null);
  } catch (error) {
    if (error instanceof FetchError) {
      emit('validated', {
        title: t('setup.requirements'),
        message: error.data.message,
      });
    }
  }
}
</script>
