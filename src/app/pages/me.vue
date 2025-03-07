<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle :text="$t('pages.me')" />
      </PanelHead>
      <PanelBody class="dark:text-neutral-200">
        <FormElement @submit.prevent="submit">
          <FormGroup>
            <FormHeading>{{ $t('form.sectionGeneral') }}</FormHeading>
            <FormTextField
              id="name"
              v-model="name"
              :label="$t('general.name')"
            />
            <FormNullTextField
              id="email"
              v-model="email"
              :label="$t('user.email')"
            />
            <FormActionField type="submit" :label="$t('form.save')" />
          </FormGroup>
        </FormElement>
        <FormElement @submit.prevent="updatePassword">
          <FormGroup>
            <FormHeading>{{ $t('general.password') }}</FormHeading>
            <FormPasswordField
              id="current-password"
              v-model="currentPassword"
              autocomplete="current-password"
              :label="$t('me.currentPassword')"
            />
            <FormPasswordField
              id="new-password"
              v-model="newPassword"
              autocomplete="new-password"
              :label="$t('general.newPassword')"
            />
            <FormPasswordField
              id="confirm-password"
              v-model="confirmPassword"
              autocomplete="new-password"
              :label="$t('general.confirmPassword')"
            />
            <FormActionField
              type="submit"
              :label="$t('general.updatePassword')"
            />
          </FormGroup>
        </FormElement>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();

const name = ref(authStore.userData?.name);
const email = ref(authStore.userData?.email);

const _submit = useSubmit(
  `/api/me`,
  {
    method: 'post',
  },
  {
    revert: () => {
      return authStore.update();
    },
  }
);

function submit() {
  return _submit({ name: name.value, email: email.value });
}

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const _updatePassword = useSubmit(
  `/api/me/password`,
  {
    method: 'post',
  },
  {
    revert: async () => {
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
    },
  }
);

function updatePassword() {
  return _updatePassword({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  });
}
</script>
