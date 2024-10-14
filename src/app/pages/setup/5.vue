<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupHostPort') }}
    </p>
    <div>
      <Label for="host">{{ $t('setup.host') }}</Label>
      <input
        id="host"
        v-model="host"
        type="text"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-200 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
        placeholder="vpn.example.com"
      />
    </div>
    <div>
      <Label for="port">{{ $t('setup.port') }}</Label>
      <input
        id="port"
        v-model="port"
        type="number"
        :min="1"
        :max="65535"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-200 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
      />
    </div>
    <BaseButton @click="updateHostPort">Continue</BaseButton>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

definePageMeta({
  layout: 'setup',
});

const { t } = useI18n();

const setupStore = useSetupStore();
setupStore.setStep(5);
const router = useRouter();
const host = ref<null | string>(null);
const port = ref<number>(51820);

async function updateHostPort() {
  if (!host.value || !port.value) {
    setupStore.handleError({
      title: t('setup.requirements'),
      message: t('setup.emptyFields'),
    });
    return;
  }

  try {
    await setupStore.updateHostPort(host.value, port.value);
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
</script>
