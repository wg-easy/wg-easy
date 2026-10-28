<template>
  <main class="page-container max-w-3xl">
    <div>
      <PanelHead>
        <PanelHeadTitle>
          {{ $t('account.title') }}
        </PanelHeadTitle>
      </PanelHead>
      <PanelBody>
        <FormElement @submit.prevent="submit">
          <FormGroup>
            <FormHeading>{{ $t('common.form.sections.general') }}</FormHeading>
            <FormTextField
              id="name"
              v-model="name"
              :label="$t('common.fields.name')"
            />
            <FormNullTextField
              id="email"
              v-model="email"
              :label="$t('common.fields.email')"
            />
          </FormGroup>
          <FormActions>
            <BasePrimaryButton type="submit">
              {{ $t('common.actions.save') }}
            </BasePrimaryButton>
          </FormActions>
        </FormElement>
        <FormElement @submit.prevent="updatePassword">
          <input
            type="text"
            name="username"
            :value="authStore.userData?.username"
            autocomplete="username"
            hidden
          />
          <FormGroup>
            <FormHeading>{{ $t('common.fields.password') }}</FormHeading>
            <FormPasswordField
              v-if="hasPassword"
              id="current-password"
              v-model="currentPassword"
              autocomplete="current-password"
              :label="$t('account.password.current')"
            />
            <FormPasswordField
              id="new-password"
              v-model="newPassword"
              autocomplete="new-password"
              :label="$t('common.fields.newPassword')"
            />
            <FormPasswordField
              id="confirm-password"
              v-model="confirmPassword"
              autocomplete="new-password"
              :label="$t('common.fields.confirmPassword')"
            />
          </FormGroup>
          <FormActions>
            <BasePrimaryButton type="submit">
              {{
                hasPassword
                  ? $t('account.password.update')
                  : $t('account.password.add')
              }}
            </BasePrimaryButton>
          </FormActions>
        </FormElement>
        <FormElement @submit.prevent>
          <FormGroup>
            <FormHeading>{{ $t('auth.twoFactor.title') }}</FormHeading>
            <template v-if="!authStore.userData?.totpVerified && !twofa">
              <div class="col-span-full flex justify-end">
                <BaseSecondaryButton type="button" @click="setup2fa">
                  {{ $t('account.twoFactor.enable.label') }}
                </BaseSecondaryButton>
              </div>
            </template>
            <div
              v-else-if="!authStore.userData?.totpVerified && twofa"
              class="col-span-2"
            >
              <p class="text-sm text-subtle">
                {{ $t('account.twoFactor.enable.description') }}
              </p>
              <div class="mt-2 flex flex-col gap-2">
                <img
                  :src="twofa.qrcode"
                  :alt="$t('account.twoFactor.enable.label')"
                  class="size-48 rounded-lg bg-white p-2"
                />
                <FormTextField
                  id="2fakey"
                  :model-value="twofa.key"
                  :on-update:model-value="() => {}"
                  :label="$t('account.twoFactor.key')"
                  :disabled="true"
                />
                <p class="text-sm text-subtle">
                  {{ $t('account.twoFactor.codeDescription') }}
                </p>
                <FormTextField
                  id="2facode"
                  v-model="code"
                  :label="$t('auth.twoFactor.code')"
                />
                <FormActions>
                  <BasePrimaryButton type="button" @click="enable2fa">
                    {{ $t('account.twoFactor.enable.label') }}
                  </BasePrimaryButton>
                </FormActions>
              </div>
            </div>
            <div
              v-else-if="authStore.userData?.totpVerified"
              class="col-span-2 flex flex-col gap-2"
            >
              <p class="text-sm text-subtle">
                {{ $t('account.twoFactor.disable.description') }}
              </p>
              <input
                type="text"
                name="username"
                :value="authStore.userData?.username"
                autocomplete="username"
                hidden
              />
              <FormPasswordField
                id="2fapassword"
                v-model="disable2faPassword"
                :label="$t('account.password.current')"
                type="password"
                autocomplete="current-password"
              />
              <FormActions>
                <BaseSecondaryButton type="button" @click="disable2fa">
                  {{ $t('account.twoFactor.disable.label') }}
                </BaseSecondaryButton>
              </FormActions>
            </div>
          </FormGroup>
        </FormElement>
        <FormElement v-if="authMethods?.oauthEnabled" @submit.prevent>
          <FormGroup>
            <FormHeading>{{ $t('auth.external.title') }}</FormHeading>
            <template v-if="oauthProvider && oauthProviderInfo?.enabled">
              <div class="flex items-center gap-2 self-center">
                <IconsBrandsProvider
                  :provider="oauthProvider"
                  class="h-4 w-4"
                />
                <span>
                  {{
                    $t('account.external.linkedWith', {
                      provider: oauthProviderInfo.friendlyName,
                    })
                  }}
                </span>
              </div>
              <div class="flex justify-end">
                <BaseSecondaryButton
                  type="button"
                  :disabled="!hasPassword"
                  @click="unlinkOauth"
                >
                  {{ $t('account.external.unlink') }}
                </BaseSecondaryButton>
              </div>
            </template>
            <template v-else-if="oauthProvider && !oauthProviderInfo?.enabled">
              <span class="flex items-center self-center">
                {{ $t('account.external.providerDisabled') }}
              </span>
              <div class="flex justify-end">
                <BaseSecondaryButton
                  type="button"
                  :disabled="!hasPassword"
                  @click="unlinkOauth"
                >
                  {{ $t('account.external.unlink') }}
                </BaseSecondaryButton>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center self-center">
                <span>{{ $t('account.external.link') }}</span>
              </div>
              <div class="flex flex-wrap justify-end gap-2">
                <BaseSecondaryButton
                  v-for="(info, provider) in authMethods.providers"
                  :key="provider"
                  as="a"
                  :href="`/api/auth/${provider}?link=true`"
                >
                  <IconsBrandsProvider :provider="provider" class="h-4 w-4" />
                  <span>{{ info.friendlyName }}</span>
                </BaseSecondaryButton>
              </div>
            </template>
          </FormGroup>
        </FormElement>
      </PanelBody>
    </div>
  </main>
</template>

<script setup lang="ts">
import { encodeQR } from 'qr';

import { $fetch } from '#imports';

const authStore = useAuthStore();

const { data: authMethods } = await useFetch('/api/auth/methods');

const name = ref(authStore.userData?.name);
const email = ref(authStore.userData?.email);
const hasPassword = computed(() => authStore.userData?.hasPassword);
const oauthProvider = computed(() => authStore.userData?.oauthProvider);
const oauthProviderInfo = computed(() => {
  if (!authStore.userData?.oauthProvider) {
    return null;
  }
  return authMethods.value?.providers?.[authStore.userData.oauthProvider];
});

const _submit = useSubmit(
  (data) =>
    $fetch(`/api/me`, {
      method: 'post',
      body: data,
    }),
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
  (data) =>
    $fetch(`/api/me/password`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async () => {
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      return authStore.update();
    },
  }
);

function updatePassword() {
  return _updatePassword({
    currentPassword: hasPassword.value ? currentPassword.value : null,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  });
}

const twofa = ref<{ key: string; qrcode: string } | null>(null);

const _setup2fa = useSubmit(
  (data) =>
    $fetch(`/api/me/totp`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success, data) => {
      if (success && data?.type === 'setup') {
        const qrcode = encodeQR(data.uri, 'svg', {
          ecc: 'high',
          scale: 4,
          encoding: 'byte',
        });
        const svg = new Blob([qrcode], { type: 'image/svg+xml' });
        twofa.value = { key: data.key, qrcode: URL.createObjectURL(svg) };
      }
    },
  }
);

async function setup2fa() {
  return _setup2fa({
    type: 'setup',
  });
}

const code = ref<string>('');

const _enable2fa = useSubmit(
  (data) =>
    $fetch(`/api/me/totp`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success, data) => {
      if (success && data?.type === 'created') {
        authStore.update();
        twofa.value = null;
        code.value = '';
      }
    },
  }
);

async function enable2fa() {
  return _enable2fa({
    type: 'create',
    code: code.value,
  });
}

const disable2faPassword = ref('');

const _disable2fa = useSubmit(
  (data) =>
    $fetch(`/api/me/totp`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success, data) => {
      if (success && data?.type === 'deleted') {
        authStore.update();
        disable2faPassword.value = '';
      }
    },
  }
);

async function disable2fa() {
  return _disable2fa({
    type: 'delete',
    currentPassword: disable2faPassword.value,
  });
}

const _unlinkOauth = useSubmit(
  (data) =>
    $fetch(`/api/auth/unlink`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async () => {
      return authStore.update();
    },
  }
);

async function unlinkOauth() {
  return _unlinkOauth({});
}
</script>
