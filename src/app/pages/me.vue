<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle :text="$t('pages.me')" />
      </PanelHead>
      <PanelBody class="dark:text-neutral-200">
        <FormElement @submit.prevent="submit">
          <FormGroup>
            <FormHeading>{{ $t('me.sectionGeneral') }}</FormHeading>
            <FormTextField id="name" v-model="name" :label="$t('name')" />
            <FormTextField id="email" v-model="email" :label="$t('email')" />
            <FormActionField type="submit" :label="$t('save')" />
          </FormGroup>
        </FormElement>
        <FormElement @submit.prevent="updatePassword">
          <FormGroup>
            <FormHeading>{{ $t('me.sectionPassword') }}</FormHeading>
            <FormPasswordField
              id="current-password"
              v-model="currentPassword"
              autocomplete="current-password"
              :label="$t('currentPassword')"
            />
            <FormPasswordField
              id="new-password"
              v-model="newPassword"
              autocomplete="new-password"
              :label="$t('setup.newPassword')"
            />
            <FormPasswordField
              id="confirm-password"
              v-model="confirmPassword"
              autocomplete="new-password"
              :label="$t('confirmPassword')"
            />
            <FormActionField type="submit" :label="$t('updatePassword')" />
          </FormGroup>
        </FormElement>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';
const authStore = useAuthStore();
authStore.update();
const toast = useToast();

const name = ref(authStore.userData?.name);

const rawEmail = ref(authStore.userData?.email);
const email = computed({
  get: () => rawEmail.value ?? undefined,
  set: (value) => {
    const temp = value?.trim() ?? null;
    if (temp === '') {
      rawEmail.value = null;
      return;
    }
    rawEmail.value = temp;
    return;
  },
});

async function submit() {
  try {
    const res = await $fetch(`/api/me`, {
      method: 'post',
      body: {
        name: name.value,
        email: rawEmail.value,
      },
    });
    toast.showToast({
      type: 'success',
      title: 'Success',
      message: 'Saved',
    });
    if (!res.success) {
      throw new Error('Failed to save');
    }
    await refreshNuxtData();
  } catch (e) {
    if (e instanceof FetchError) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: e.data.message,
      });
    }
  }
}

// TODO: handle update password
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

function updatePassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast.showToast({
      type: 'error',
      title: 'Error',
      message: 'Passwords do not match',
    });
  }
}
</script>
