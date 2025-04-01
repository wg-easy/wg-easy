<template>
  <main>
    <UiBanner />
    <HeaderInsecure />
    <form
      class="mx-auto mt-10 flex w-64 flex-col gap-5 overflow-hidden rounded-md bg-white p-5 text-gray-700 shadow dark:bg-neutral-700 dark:text-neutral-200"
      @submit.prevent="submit"
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
        <IconsLoading v-if="authenticating" class="mx-auto w-5 animate-spin" />
        <span v-else>{{ $t('login.signIn') }}</span>
      </button>
    </form>
  </main>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();

const toast = useToast();
const { t } = useI18n();

const authenticating = ref(false);
const remember = ref(false);
const username = ref<string>('');
const password = ref<string>('');
const totpRequired = ref(false);
const totp = ref<string>('');

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
