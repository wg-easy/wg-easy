<template>
  <main class="page-container max-w-3xl">
    <div>
      <PanelHead>
        <PanelHeadTitle>
          {{ $t('pages.me') }}
        </PanelHeadTitle>
      </PanelHead>
      <PanelBody>
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
          </FormGroup>
          <FormActions>
            <BasePrimaryButton type="submit">
              {{ $t('form.save') }}
            </BasePrimaryButton>
          </FormActions>
        </FormElement>
        <FormElement @submit.prevent="updatePassword">
          <FormGroup>
            <FormHeading>{{ $t('general.password') }}</FormHeading>
            <FormPasswordField
              v-if="hasPassword"
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
          </FormGroup>
          <FormActions>
            <BasePrimaryButton type="submit">
              {{
                hasPassword
                  ? $t('general.updatePassword')
                  : $t('general.addPassword')
              }}
            </BasePrimaryButton>
          </FormActions>
        </FormElement>
        <FormElement @submit.prevent>
          <FormGroup>
            <FormHeading>{{ $t('general.2fa') }}</FormHeading>
            <template v-if="!authStore.userData?.totpVerified && !twofa">
              <div class="col-span-full flex justify-end">
                <BaseSecondaryButton type="button" @click="setup2fa">
                  {{ $t('me.enable2fa') }}
                </BaseSecondaryButton>
              </div>
            </template>
            <div
              v-else-if="!authStore.userData?.totpVerified && twofa"
              class="col-span-2"
            >
              <p class="text-sm text-subtle">
                {{ $t('me.enable2faDesc') }}
              </p>
              <div class="mt-2 flex flex-col gap-2">
                <img
                  :src="twofa.qrcode"
                  :alt="$t('me.enable2fa')"
                  class="size-48 rounded-lg bg-white p-2"
                />
                <FormTextField
                  id="2fakey"
                  :model-value="twofa.key"
                  :on-update:model-value="() => {}"
                  :label="$t('me.2faKey')"
                  :disabled="true"
                />
                <p class="text-sm text-subtle">
                  {{ $t('me.2faCodeDesc') }}
                </p>
                <FormTextField
                  id="2facode"
                  v-model="code"
                  :label="$t('general.2faCode')"
                />
                <FormActions>
                  <BasePrimaryButton type="button" @click="enable2fa">
                    {{ $t('me.enable2fa') }}
                  </BasePrimaryButton>
                </FormActions>
              </div>
            </div>
            <div
              v-else-if="authStore.userData?.totpVerified"
              class="col-span-2 flex flex-col gap-2"
            >
              <p class="text-sm text-subtle">
                {{ $t('me.disable2faDesc') }}
              </p>
              <FormPasswordField
                id="2fapassword"
                v-model="disable2faPassword"
                :label="$t('me.currentPassword')"
                type="password"
                autocomplete="current-password"
              />
              <FormActions>
                <BaseSecondaryButton type="button" @click="disable2fa">
                  {{ $t('me.disable2fa') }}
                </BaseSecondaryButton>
              </FormActions>
            </div>
          </FormGroup>
        </FormElement>
        <FormElement v-if="authMethods?.oauthEnabled" @submit.prevent>
          <FormGroup>
            <FormHeading>{{ $t('general.externalAuth') }}</FormHeading>
            <template v-if="oauthProvider && oauthProviderInfo?.enabled">
              <div class="flex items-center gap-2 self-center">
                <IconsBrandsProvider
                  :provider="oauthProvider"
                  class="h-4 w-4"
                />
                <span>
                  {{
                    $t('me.linkedWith', {
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
                  {{ $t('me.unlinkOauth') }}
                </BaseSecondaryButton>
              </div>
            </template>
            <template v-else-if="oauthProvider && !oauthProviderInfo?.enabled">
              <span class="flex items-center self-center">
                {{ $t('me.providerDisabled') }}
              </span>
              <div class="flex justify-end">
                <BaseSecondaryButton
                  type="button"
                  :disabled="!hasPassword"
                  @click="unlinkOauth"
                >
                  {{ $t('me.unlinkOauth') }}
                </BaseSecondaryButton>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center self-center">
                <span>{{ $t('me.linkOauth') }}</span>
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
