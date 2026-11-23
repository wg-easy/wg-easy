<template>
  <p
    v-if="authMethods?.passwordDisabled"
    role="alert"
    class="text-sm leading-relaxed text-muted"
  >
    {{ $t('setup.enablePasswordSignIn') }}
  </p>
  <form v-else @submit.prevent="submit">
    <p class="text-sm leading-relaxed text-muted">
      {{ $t('setup.createAdminDescription') }}
    </p>
    <div class="mt-8 flex flex-col gap-3">
      <div class="flex flex-col">
        <FormNullTextField
          id="username"
          v-model="username"
          autocomplete="username"
          :label="$t('common.fields.username')"
        />
      </div>
      <div class="flex flex-col">
        <FormPasswordField
          id="password"
          v-model="password"
          autocomplete="new-password"
          :label="$t('common.fields.password')"
        />
      </div>
      <div class="flex flex-col">
        <FormPasswordField
          id="confirmPassword"
          v-model="confirmPassword"
          autocomplete="new-password"
          :label="$t('common.fields.confirmPassword')"
        />
      </div>
      <div class="mt-4 flex justify-center">
        <BasePrimaryButton type="submit">
          {{ $t('setup.createAccount') }}
        </BasePrimaryButton>
      </div>
    </div>
  </form>
</template>

<script lang="ts" setup>
import { $fetch } from '#imports';

definePageMeta({
  layout: 'setup',
});

useSetupStore().step = 2;
const { data: authMethods } = await useFetch('/api/auth/methods');

const username = ref<null | string>(null);
const password = ref<string>('');
const confirmPassword = ref<string>('');

const _submit = useSubmit(
  (data) =>
    $fetch('/api/setup/2', {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success) => {
      if (success) {
        await navigateTo('/login');
      }
    },
    noSuccessToast: true,
  }
);

function submit() {
  return _submit({
    username: username.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  });
}
</script>
