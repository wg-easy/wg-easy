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

      <div v-if="authMethods" class="flex flex-col gap-5">
        <!-- Google OAuth Button -->
        <a
          v-if="authMethods.providers?.google"
          href="/api/auth/google"
          class="flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-300 bg-white py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          <IconsBrandsGoogle class="h-4 w-4" />
          <span>{{ $t('login.signInWith', ['Google']) }}</span>
        </a>
        <!-- GitHub OAuth Button -->
        <a
          v-if="authMethods.providers?.github"
          href="/api/auth/github"
          class="flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-300 bg-white py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          <IconsBrandsGitHub class="h-4 w-4" />
          <span>{{ $t('login.signInWith', ['GitHub']) }}</span>
        </a>

        <!-- Divider -->
        <div v-if="authMethods.oauthEnabled" class="flex items-center gap-2">
          <div class="h-px flex-1 bg-gray-300 dark:bg-neutral-600"></div>
          <span class="text-xs text-gray-500 dark:text-neutral-400">{{
            $t('login.or')
          }}</span>
          <div class="h-px flex-1 bg-gray-300 dark:bg-neutral-600"></div>
        </div>
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
  (data) =>
    $fetch('/api/session', {
      method: 'post',
      body: data,
    }),
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
