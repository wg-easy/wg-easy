<template>
  <main>
    <UiBanner />
    <form
      class="mx-auto mt-10 w-64 overflow-hidden rounded-md bg-white p-5 text-gray-700 shadow dark:bg-neutral-700 dark:text-neutral-200"
      @submit="login"
    >
      <!-- Avatar -->
      <div
        class="relative mx-auto mb-10 mt-5 h-20 w-20 overflow-hidden rounded-full bg-red-800 dark:bg-red-800"
      >
        <IconsAvatar class="m-5 h-10 w-10 text-white dark:text-white" />
      </div>

      <input
        v-model="username"
        type="text"
        name="username"
        :placeholder="$t('username')"
        autocomplete="username"
        autofocus
        class="mb-5 w-full rounded-lg border-2 border-gray-100 px-3 py-2 text-sm text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-gray-500 dark:placeholder:text-neutral-400 dark:focus:border-red-800"
      />

      <input
        v-model="password"
        type="password"
        name="password"
        :placeholder="$t('password')"
        autocomplete="current-password"
        class="mb-5 w-full rounded-lg border-2 border-gray-100 px-3 py-2 text-sm text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-gray-500 dark:placeholder:text-neutral-400 dark:focus:border-red-800"
      />

      <label
        class="mb-5 inline-block cursor-pointer whitespace-nowrap"
        :title="$t('titleRememberMe')"
      >
        <input v-model="remember" type="checkbox" class="sr-only" />

        <div
          v-if="remember"
          class="mr-1 inline-block h-6 w-10 cursor-pointer rounded-full bg-red-800 align-middle transition-all hover:bg-red-700"
        >
          <div class="m-1 ml-5 h-4 w-4 rounded-full bg-white"></div>
        </div>

        <div
          v-if="!remember"
          class="mr-1 inline-block h-6 w-10 cursor-pointer rounded-full bg-gray-200 align-middle transition-all hover:bg-gray-300 dark:bg-neutral-400 dark:hover:bg-neutral-500"
        >
          <div class="m-1 h-4 w-4 rounded-full bg-white"></div>
        </div>

        <span class="text-sm">{{ $t('rememberMe') }}</span>
      </label>

      <button
        v-if="authenticating"
        class="w-full cursor-not-allowed rounded bg-red-800 py-2 text-sm text-white shadow dark:bg-red-800 dark:text-white"
      >
        <IconsLoading class="mx-auto w-5 animate-spin" />
      </button>
      <input
        v-else
        type="submit"
        :class="[
          {
            'cursor-pointer bg-red-800 transition hover:bg-red-700 dark:bg-red-800 dark:hover:bg-red-700':
              password,
            'cursor-not-allowed bg-gray-200 dark:bg-neutral-800': !password,
          },
          'w-full rounded py-2 text-sm text-white shadow dark:text-white',
        ]"
        :value="$t('signIn')"
      />
    </form>

    <BaseToast ref="toast" />
  </main>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const { t } = useI18n();

const authenticating = ref(false);
const remember = ref(false);
const username = ref<null | string>(null);
const password = ref<null | string>(null);
const authStore = useAuthStore();
const toast = useTemplateRef('toast');

async function login(e: Event) {
  e.preventDefault();

  if (!username.value || !password.value || authenticating.value) return;

  authenticating.value = true;
  try {
    const res = await authStore.login(
      username.value,
      password.value,
      remember.value
    );
    if (res) {
      await navigateTo('/');
    }
  } catch (error) {
    if (error instanceof FetchError) {
      toast.value?.publish({
        title: t('error.login'),
        message: error.data.message,
      });
    }
  }
  authenticating.value = false;
  password.value = null;
}
</script>
