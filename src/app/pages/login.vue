<template>
  <main>
    <UiBanner />
    <HeaderInsecure />
    <div
      class="mx-auto mt-10 flex w-64 flex-col gap-5 overflow-hidden rounded-md bg-white p-5 text-gray-700 shadow dark:bg-neutral-700 dark:text-neutral-200"
    >
      <!-- Avatar -->
      <div
        class="mx-auto mb-5 mt-5 h-20 w-20 overflow-hidden rounded-full bg-red-800 dark:bg-red-800"
      >
        <IconsAvatar class="m-5 h-10 w-10 text-white dark:text-white" />
      </div>

      <!-- Google OAuth Button -->
      <a
        v-if="authMethods?.google"
        href="/api/auth/google"
        class="flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-300 bg-white py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>{{ $t('login.signInWithGoogle') }}</span>
      </a>

      <!-- Divider -->
      <div v-if="authMethods?.google" class="flex items-center gap-2">
        <div class="h-px flex-1 bg-gray-300 dark:bg-neutral-600"></div>
        <span class="text-xs text-gray-500 dark:text-neutral-400">{{
          $t('login.or')
        }}</span>
        <div class="h-px flex-1 bg-gray-300 dark:bg-neutral-600"></div>
      </div>

      <!-- Classic Login Form -->
      <form class="flex flex-col gap-5" @submit.prevent="submit">
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

        <BaseInput
          v-if="totpRequired"
          v-model="totp"
          type="text"
          name="totp"
          :placeholder="$t('general.2faCode')"
          autocomplete="one-time-code"
          inputmode="numeric"
          maxlength="6"
          pattern="\d{6}"
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
          <IconsLoading
            v-if="authenticating"
            class="mx-auto w-5 animate-spin"
          />
          <span v-else>{{ $t('login.signIn') }}</span>
        </button>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
const toast = useToast();
const { t } = useI18n();

const authenticating = ref(false);
const remember = ref(false);
const username = ref<string>('');
const password = ref<string>('');
const totpRequired = ref(false);
const totp = ref<string>('');

const { data: authMethods } = await useFetch('/api/auth/methods');

const _submit = useSubmit(
  '/api/session',
  {
    method: 'post',
  },
  {
    revert: async (success, data) => {
      if (success) {
        if (data?.status === 'success') {
          await navigateTo('/');
        } else if (data?.status === 'TOTP_REQUIRED') {
          authenticating.value = false;
          totpRequired.value = true;
          toast.showToast({
            title: t('general.2fa'),
            message: t('login.2faRequired'),
            type: 'error',
          });
          return;
        } else if (data?.status === 'INVALID_TOTP_CODE') {
          authenticating.value = false;
          totp.value = '';
          toast.showToast({
            title: t('general.2fa'),
            message: t('login.2faWrong'),
            type: 'error',
          });
          return;
        }
      }
      authenticating.value = false;
      password.value = '';
    },
    noSuccessToast: true,
  }
);

async function submit() {
  if (!username.value || !password.value || authenticating.value) return;

  authenticating.value = true;

  return _submit({
    username: username.value,
    password: password.value,
    remember: remember.value,
    totpCode: totpRequired.value ? totp.value : undefined,
  });
}
</script>
