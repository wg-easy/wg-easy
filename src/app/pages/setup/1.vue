<template>
  <div>
    <p class="p-8 text-center text-lg">
      {{ $t('setup.messageSetupLanguage') }}
    </p>
    <div class="mb-8 flex justify-center">
      <UiChooseLang @update:lang="handleEventUpdateLang" />
    </div>
    <div><BaseButton @click="nextStep">Continue</BaseButton></div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'setup',
});

const { setLocale } = useI18n();

function handleEventUpdateLang(value: string) {
  setLocale(value);
}
const setupStore = useSetupStore();
setupStore.setStep(1);

const router = useRouter();

async function nextStep() {
  router.push('/setup/2');
}
</script>
