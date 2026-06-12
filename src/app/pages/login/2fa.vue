<template>
  <div>
    <form class="flex flex-col gap-5" @submit.prevent="submit">
      <BaseInput
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
        class="rounded bg-red-800 py-2 text-sm text-white shadow transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-200 dark:bg-red-800 dark:text-white dark:hover:bg-red-700 disabled:dark:bg-neutral-800"
        :disabled="!totp || authenticating"
      >
        <IconsLoading v-if="authenticating" class="mx-auto w-5 animate-spin" />
        <span v-else>{{ $t('general.continue') }}</span>
      </button>

      <button
        type="button"
        class="rounded border-2 border-gray-100 py-2 text-sm text-gray-700 transition hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-neutral-600 dark:text-neutral-200"
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
