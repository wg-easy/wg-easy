<template>
  <div>
    <p class="text-center text-lg">
      {{ $t('setup.createAdminDesc') }}
    </p>
    <div class="mt-8 flex flex-col gap-3">
      <div class="flex flex-col">
        <FormNullTextField
          id="username"
          v-model="username"
          autocomplete="username"
          :label="$t('general.username')"
        />
      </div>
      <div class="flex flex-col">
        <FormPasswordField
          id="password"
          v-model="password"
          autocomplete="new-password"
          :label="$t('general.password')"
        />
      </div>
      <div class="flex flex-col">
        <FormPasswordField
          id="confirmPassword"
          v-model="confirmPassword"
          autocomplete="new-password"
          :label="$t('general.confirmPassword')"
        />
      </div>
      <div class="mt-4 flex justify-center">
        <BasePrimaryButton @click="submit">
          {{ $t('setup.createAccount') }}
        </BasePrimaryButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(2);

const username = ref<null | string>(null);
const password = ref<string>('');
const confirmPassword = ref<string>('');

const _submit = useSubmit(
  '/api/setup/2',
  {
    method: 'post',
  },
  {
    revert: async (success) => {
      if (success) {
        await navigateTo('/setup/3');
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
