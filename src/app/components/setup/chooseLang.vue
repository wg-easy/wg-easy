<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupLanguage') }}
    </p>
    <div class="flex justify-center mb-8">
      <UiChooseLang @update:lang="handleEventUpdateLang" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const globalStore = useGlobalStore();
const { t, locale, setLocale } = useI18n();

const emit = defineEmits(['validated']);

const props = defineProps<{
  next: boolean;
}>();

const next = toRef(props, 'next');

watch(next, async (newVal) => {
  if (newVal) {
    await updateLang();
  }
});

function handleEventUpdateLang(value: string) {
  setLocale(value);
}

async function updateLang() {
  try {
    await globalStore.updateLang(locale.value);
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
