<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupHostPort') }}
    </p>
    <div>
      <Label for="host">{{ $t('setup.host') }}</Label>
      <input v-model="host" type="text" :class="inputClass" />
    </div>
    <div>
      <Label for="port">{{ $t('setup.port') }}</Label>
      <input
        v-model="port"
        type="number"
        :min="1"
        :max="65535"
        :class="inputClass"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const setupStore = useSetupStore();
const { t } = useI18n();

const inputClass =
  'px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0';

const emit = defineEmits(['validated']);

const props = defineProps<{
  next: boolean;
}>();

const next = toRef(props, 'next');

watch(next, async (newVal) => {
  if (newVal) {
    await updateHostPort();
  }
});

const host = ref<null | string>(null);
const port = ref<null | number>(null);

async function updateHostPort() {
  if (!host.value || !port.value) return;
  try {
    await setupStore.updateHostPort(host.value, port.value);
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
