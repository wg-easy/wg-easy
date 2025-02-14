<template>
  <main>
    <UiBanner />
    <form
      class="mx-auto mt-10 flex w-64 flex-col gap-5 overflow-hidden rounded-md bg-white p-5 text-gray-700 shadow dark:bg-neutral-700 dark:text-neutral-200"
      @submit.prevent="login"
    >
      <!-- Avatar -->
      <div
        class="mx-auto mb-5 mt-5 h-20 w-20 overflow-hidden rounded-full bg-red-800 dark:bg-red-800"
      >
        <IconsAvatar class="m-5 h-10 w-10 text-white dark:text-white" />
      </div>

      <BaseInput
        v-model="username"
        type="text"
        :placeholder="$t('general.username')"
        autocomplete="username"
        autofocus
        name="username"
      />

      <BaseInput
        v-model="password"
        type="password"
        name="password"
        :placeholder="$t('general.password')"
        autocomplete="current-password"
      />

      <label
        class="flex gap-2 whitespace-nowrap"
        :title="$t('login.rememberMeDesc')"
      >
        <BaseSwitch v-model="remember" />
        <span class="text-sm">{{ $t('login.rememberMe') }}</span>
      </label>

      <button
        class="rounded py-2 text-sm text-white shadow transition dark:text-white"
        :class="{
          'cursor-pointer bg-red-800 hover:bg-red-700 dark:bg-red-800 dark:hover:bg-red-700':
            password && username,
          'cursor-not-allowed bg-gray-200 dark:bg-neutral-800':
            !password || !username,
        }"
      >
        <IconsLoading v-if="authenticating" class="mx-auto w-5 animate-spin" />
        <span v-else>{{ $t('login.signIn') }}</span>
      </button>
    </form>
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
const toast = useToast();

async function login() {
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
      toast.showToast({
        type: 'error',
        title: t('error.login'),
        message: error.data.message,
      });
    }
  }
  authenticating.value = false;
  password.value = null;
}
</script>
