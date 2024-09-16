<template>
  <main class="container mx-auto px-4">
    <h1
      class="text-4xl font-medium my-16 text-center text-gray-700 dark:text-neutral-200"
    >
      <img src="/logo.png" width="32" class="inline align-middle dark:bg" />
      <span class="align-middle">WireGuard</span>
    </h1>
    <Panel>
      <PanelBody class="lg:w-[60%] mx-auto mt-10 p-4">
        <h2 class="mt-8 mb-16 text-3xl font-medium">
          {{ $t('setup.welcome') }}
        </h2>
        <p class="text-lg p-8">{{ $t('setup.msg') }}</p>
        <form class="mb-8" @submit.prevent="newAccount">
          <div>
            <label for="username" class="inline-block py-2">{{
              $t('username')
            }}</label>
            <input
              id="username"
              v-model="username"
              type="text"
              name="username"
              autocomplete="username"
              autofocus
              :placeholder="$t('setup.usernamePlaceholder')"
              class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
            />
          </div>
          <div>
            <Label for="password" class="inline-block py-2">{{
              $t('setup.newPassword')
            }}</Label>
            <input
              id="password"
              v-model="password"
              type="password"
              name="password"
              autocomplete="new-password"
              :placeholder="$t('setup.passwordPlaceholder')"
              class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
            />
          </div>
          <div>
            <Label for="accept" class="inline-block my-4 mr-4">{{
              $t('setup.accept')
            }}</Label>
            <input id="accept" v-model="accept" type="checkbox" name="accept" />
          </div>
          <button
            type="submit"
            :class="[
              {
                'bg-red-800 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer':
                  password && username,
                'bg-gray-200 dark:bg-neutral-800 cursor-not-allowed':
                  !password && !username,
              },
              'w-max px-4 rounded shadow py-2 text-sm text-white dark:text-white',
            ]"
          >
            {{ $t('setup.submitBtn') }}
          </button>
        </form>
      </PanelBody>
    </Panel>

    <ErrorToast
      v-if="setupError"
      :title="setupError.title"
      :message="setupError.message"
      :duration="12000"
    />
  </main>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const { t } = useI18n();

const username = ref<null | string>(null);
const password = ref<null | string>(null);
const accept = ref<boolean>(true);
const authStore = useAuthStore();

type SetupError = {
  title: string;
  message: string;
};

const setupError = ref<null | SetupError>(null);

watch(setupError, (value) => {
  if (value) {
    setTimeout(() => {
      setupError.value = null;
    }, 13000);
  }
});

async function newAccount() {
  if (!username.value || !password.value) return;

  try {
    const res = await authStore.signup(
      username.value,
      password.value,
      accept.value
    );
    if (res) {
      navigateTo('/login');
    }
  } catch (error) {
    if (error instanceof FetchError) {
      setupError.value = {
        title: t('setup.requirements'),
        message: error.data.message,
      };
    }
  }
}
</script>
