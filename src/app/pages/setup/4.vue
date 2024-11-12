<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupCreateAdminUser') }}
    </p>
    <form id="newAccount"></form>
    <div>
      <Label for="username">{{ $t('username') }}</Label>
      <input
        id="username"
        v-model="username"
        form="newAccount"
        type="text"
        autocomplete="username"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-200 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
      />
    </div>
    <div>
      <Label for="password">{{ $t('setup.newPassword') }}</Label>
      <input
        id="password"
        v-model="password"
        form="newAccount"
        type="password"
        autocomplete="new-password"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-200 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
      />
    </div>
    <div>
      <Label for="accept">{{ $t('setup.accept') }}</Label>
      <input
        id="accept"
        v-model="accept"
        form="newAccount"
        type="checkbox"
        class="ml-2"
      />
    </div>
    <BaseButton @click="newAccount">Create Account</BaseButton>
  </div>
</template>

<script lang="ts" setup>
import { FetchError } from 'ofetch';
const { t } = useI18n();

definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(4);
const router = useRouter();
const username = ref<null | string>(null);
const password = ref<null | string>(null);
const accept = ref<boolean>(true);

async function newAccount() {
  try {
    if (!username.value || !password.value) {
      setupStore.handleError({
        title: t('setup.requirements'),
        message: t('setup.emptyFields'),
      });
      return;
    }

    await setupStore.step4(username.value, password.value, accept.value);
    await router.push('/setup/5');
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
