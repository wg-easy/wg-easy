<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupValidation') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const { t } = useI18n();

const emit = defineEmits(['validated']);

const props = defineProps<{
  next: boolean;
}>();

const next = toRef(props, 'next');

watch(next, async (newVal) => {
  if (newVal) {
    await runNext();
  }
});

async function runNext() {
  try {
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
