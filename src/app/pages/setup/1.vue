<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupLanguage') }}
    </p>
    <div class="flex justify-center mb-8">
      <UiChooseLang @update:lang="handleEventUpdateLang" />
    </div>
    <div><BaseButton @click="updateLang">Continue</BaseButton></div>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

definePageMeta({
  layout: 'setup',
});

const { t, locale, setLocale } = useI18n();

function handleEventUpdateLang(value: string) {
  setLocale(value);
}

const setupStore = useSetupStore();
setupStore.setStep(1);
const globalStore = useGlobalStore();
const router = useRouter();
async function updateLang() {
  try {
    await globalStore.updateLang(locale.value);
    router.push('/setup/2');
  } catch (error) {
    if (error instanceof FetchError) {
      setupStore.handleError({
        title: t('setup.requirements'),
        message: error.data.message,
      });
    }
  }
}
</script>
