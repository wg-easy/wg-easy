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
        <FormElement @submit.prevent>
          <FormGroup>
            <FormHeading>{{ $t('general.2fa') }}</FormHeading>
            <FormActionField
              v-if="!authStore.userData?.totpVerified && !twofa"
              :label="$t('me.enable2fa')"
              @click="enable2fa1"
            />
            <div
              v-if="!authStore.userData?.totpVerified && twofa"
              class="col-span-2"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('me.enable2faDesc') }}
              </p>
              <div class="mt-2 flex flex-col gap-2">
                <img :src="twofa.qrcode" size="128" class="bg-white" />
                <FormTextField
                  id="2fakey"
                  :model-value="twofa.key"
                  :on-update:model-value="() => {}"
                  :label="$t('me.2faKey')"
                  :disabled="true"
                />
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('me.2faCodeDesc') }}
                </p>
                <FormNullTextField
                  id="2facode"
                  v-model="code"
                  :label="$t('me.2faCode')"
                />
                <FormActionField
                  :label="$t('me.enable2fa')"
                  @click="enable2fa2"
                />
              </div>
            </div>
            <div
              v-if="authStore.userData?.totpVerified"
              class="col-span-2 flex flex-col gap-2"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('me.disable2faDesc') }}
              </p>
              <FormActionField
                :label="$t('me.disable2fa')"
                @click="disable2fa"
              />
            </div>
          </FormGroup>
        </FormElement>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
import { encodeQR } from 'qr';

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

const twofa = ref<{ key: string; qrcode: string } | null>(null);

async function enable2fa1() {
  try {
    const response = await $fetch('/api/me/totp', {
      method: 'post',
      body: {
        code: null,
      },
    });
    if (!response.success && !response.type) {
      throw new Error('Failed to enable 2FA');
    }
    if (response.type === 'create') {
      const qrcode = encodeQR(response.uri, 'svg', {
        ecc: 'high',
        scale: 4,
        encoding: 'byte',
      });
      const svg = new Blob([qrcode], { type: 'image/svg+xml' });
      twofa.value = { key: response.key, qrcode: URL.createObjectURL(svg) };
    }
  } catch (e) {
    console.error(e);
  }
}

const code = ref<string | null>(null);

async function enable2fa2() {
  try {
    const response = await $fetch('/api/me/totp', {
      method: 'post',
      body: {
        code: code.value,
      },
    });
    if (!response.type) {
      throw new Error('Failed to enable 2FA');
    }
    if (response.type === 'created' && response.success) {
      authStore.update();
      twofa.value = null;
      code.value = null;
    }
  } catch (e) {
    console.error(e);
  }
}

async function disable2fa() {}
</script>
