<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle>
          {{ $t('pages.me') }}
        </PanelHeadTitle>
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
            <FormSecondaryActionField type="submit" :label="$t('form.save')" />
          </FormGroup>
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
            <FormSecondaryActionField
              type="submit"
              :label="
                hasPassword
                  ? $t('general.updatePassword')
                  : $t('general.addPassword')
              "
            />
          </FormGroup>
        </FormElement>
        <FormElement @submit.prevent>
          <FormGroup>
            <FormHeading>{{ $t('general.2fa') }}</FormHeading>
            <template v-if="!authStore.userData?.totpVerified && !twofa">
              <FormSecondaryActionField
                :label="$t('me.enable2fa')"
                @click="setup2fa"
              />
            </template>
            <div
              v-else-if="!authStore.userData?.totpVerified && twofa"
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
                <FormTextField
                  id="2facode"
                  v-model="code"
                  :label="$t('general.2faCode')"
                />
                <FormSecondaryActionField
                  :label="$t('me.enable2fa')"
                  @click="enable2fa"
                />
              </div>
            </div>
            <div
              v-else-if="authStore.userData?.totpVerified"
              class="col-span-2 flex flex-col gap-2"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('me.disable2faDesc') }}
              </p>
              <FormPasswordField
                id="2fapassword"
                v-model="disable2faPassword"
                :label="$t('me.currentPassword')"
                type="password"
                autocomplete="current-password"
              />
              <FormSecondaryActionField
                :label="$t('me.disable2fa')"
                @click="disable2fa"
              />
            </div>
          </FormGroup>
        </FormElement>
        <FormElement v-if="authMethods?.oauthEnabled" @submit.prevent>
          <FormGroup>
            <FormHeading>{{ $t('general.externalAuth') }}</FormHeading>
            <template v-if="oauthProvider && oauthProviderInfo?.enabled">
              <div class="flex items-center gap-2">
                <IconsBrandsProvider
                  :provider="oauthProvider"
                  class="h-4 w-4"
                />
                <span>
                  {{ $t('me.linkedWith', [oauthProviderInfo.friendlyName]) }}
                </span>
              </div>
              <div>
                <FormSecondaryActionField
                  :label="$t('me.unlinkOauth')"
                  class="w-full"
                  :disabled="!hasPassword"
                  @click="unlinkOauth"
                />
              </div>
            </template>
            <template v-else-if="oauthProvider && !oauthProviderInfo?.enabled">
              <span class="flex items-center">
                {{ $t('me.providerDisabled') }}
              </span>
              <div>
                <FormSecondaryActionField
                  :label="$t('me.unlinkOauth')"
                  class="w-full"
                  :disabled="!hasPassword"
                  @click="unlinkOauth"
                />
              </div>
            </template>
            <template v-else>
              <div class="flex items-center">
                <span>{{ $t('me.linkOauth') }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <BaseFormSecondaryButton
                  v-for="(info, provider) in authMethods.providers"
                  :key="provider"
                  class="flex items-center gap-2 p-2"
                  as="a"
                  :href="`/api/auth/${provider}?link=true`"
                >
                  <IconsBrandsProvider :provider="provider" class="h-4 w-4" />
                  <span>{{ info.friendlyName }}</span>
                </BaseFormSecondaryButton>
              </div>
            </template>
          </FormGroup>
        </FormElement>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
import { encodeQR } from 'qr';

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
