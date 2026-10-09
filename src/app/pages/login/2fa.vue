<template>
  <div>
    <form class="flex flex-col gap-5" @submit.prevent="submit">
      <label for="login-totp" class="-mb-3 text-xs font-medium text-muted">{{
        $t('general.2faCode')
      }}</label>
      <BaseInput
        id="login-totp"
        v-model="totp"
        type="text"
        name="totp"
        :placeholder="$t('general.2faCode')"
        autocomplete="one-time-code"
        inputmode="numeric"
        maxlength="6"
        pattern="\d{6}"
        autofocus
      />

      <button
        class="ui-button ui-button-primary w-full"
        :disabled="!totp || authenticating"
      >
        <IconsLoading v-if="authenticating" class="mx-auto w-5 animate-spin" />
        <span v-else>{{ $t('general.continue') }}</span>
      </button>

      <button
        type="button"
        class="ui-button ui-button-secondary w-full"
        @click="cancel"
      >
        {{ $t('dialog.cancel') }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();
const { t } = useI18n();

const authenticating = ref(false);
const totp = ref<string>('');

const { error } = await useFetch('/api/auth/pending');
if (error.value) {
  await navigateTo('/login');
}

const _submit = useSubmit(
  (data) =>
    $fetch('/api/auth/verify-2fa', {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success, data) => {
      if (success) {
        if (data?.status === 'success') {
          await navigateTo('/');
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
        } else if (data?.status === 'PENDING_LOGIN_EXPIRED') {
          toast.showToast({
            title: t('general.2fa'),
            message: t('login.loginExpired'),
            type: 'error',
          });
          await navigateTo('/login');
          return;
        }
      }
      authenticating.value = false;
    },
    noSuccessToast: true,
  }
);

async function submit() {
  if (!totp.value || authenticating.value) return;

  authenticating.value = true;
  return _submit({ totpCode: totp.value });
}

const _cancel = useSubmit(
  (data) =>
    $fetch('/api/auth/cancel', {
      method: 'post',
      body: data,
    }),
  {
    revert: async () => {
      await navigateTo('/login');
    },
    noSuccessToast: true,
  }
);

async function cancel() {
  return _cancel({});
}
</script>
