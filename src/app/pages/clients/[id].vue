<template>
  <main v-if="data">
    <Panel>
      <NuxtLink
        to="/"
        class="mb-6 inline-flex items-center gap-2 text-xs text-muted hover:text-foreground"
      >
        <CircleArrowLeftIcon class="size-4" />
        {{ $t('clients.title') }}
      </NuxtLink>
      <PanelHead>
        <PanelHeadTitle>
          {{ data.name }}
        </PanelHeadTitle>
      </PanelHead>
      <PanelBody>
        <FormElement class="settings-grid space-y-0" @submit.prevent="submit">
          <FormGroup>
            <FormHeading>
              {{ $t('common.form.sections.general') }}
            </FormHeading>
            <FormTextField
              id="name"
              v-model="data.name"
              :label="$t('common.fields.name')"
            />
            <FormSwitchField
              id="enabled"
              v-model="data.enabled"
              :label="$t('clients.status.enabled')"
            />
            <FormDateField
              id="expiresAt"
              v-model="data.expiresAt"
              :description="$t('clients.fields.expiresAt.description')"
              :label="$t('clients.fields.expiresAt.label')"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('clients.keys.title') }}</FormHeading>
            <FormLabel for="publicKey">
              {{ $t('clients.keys.publicKey') }}
            </FormLabel>
            <span
              id="publicKey"
              class="min-w-0 self-center font-mono text-sm break-all select-all"
            >
              {{ data.publicKey }}
            </span>
            <FormInfoField
              id="preSharedKey"
              :label="$t('clients.keys.preSharedKey')"
              :data="
                data.hasPreSharedKey
                  ? $t('clients.keys.preSharedKeySet')
                  : $t('clients.keys.preSharedKeyNone')
              "
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('clients.fields.address.label') }}</FormHeading>
            <FormTextField
              id="ipv4Address"
              v-model="data.ipv4Address"
              label="IPv4"
            />
            <FormTextField
              id="ipv6Address"
              v-model="data.ipv6Address"
              label="IPv6"
            />
            <FormInfoField
              id="endpoint"
              :data="data.endpoint ?? $t('clients.status.notConnected')"
              :label="$t('clients.fields.endpoint.label')"
              :description="$t('clients.fields.endpoint.description')"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading
              :description="$t('clients.fields.allowedIps.description')"
            >
              {{ $t('wireguard.fields.allowedIps') }}
            </FormHeading>
            <FormNullArrayField v-model="data.allowedIps" name="allowedIps" />
          </FormGroup>
          <FormGroup>
            <FormHeading
              :description="$t('clients.fields.serverAllowedIps.description')"
            >
              {{ $t('clients.fields.serverAllowedIps.label') }}
            </FormHeading>
            <FormArrayField
              v-model="data.serverAllowedIps"
              name="serverAllowedIps"
            />
          </FormGroup>
          <FormGroup v-if="globalStore.information?.firewallEnabled">
            <FormHeading
              :description="$t('clients.fields.firewallIps.description')"
            >
              {{ $t('clients.fields.firewallIps.label') }}
            </FormHeading>
            <FormNullArrayField v-model="data.firewallIps" name="firewallIps" />
          </FormGroup>
          <FormGroup>
            <FormHeading :description="$t('clients.fields.dns.description')">
              {{ $t('wireguard.fields.dns') }}
            </FormHeading>
            <FormNullArrayField v-model="data.dns" name="dns" />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('common.form.sections.advanced') }}</FormHeading>
            <FormNullNumberField
              id="mtu"
              v-model="data.mtu"
              :description="$t('clients.fields.mtu.description')"
              :label="$t('wireguard.fields.mtu')"
            />
            <FormNumberField
              id="persistentKeepalive"
              v-model="data.persistentKeepalive"
              :description="
                $t('clients.fields.persistentKeepalive.description')
              "
              :label="$t('wireguard.fields.persistentKeepalive')"
            />
          </FormGroup>
          <FormGroup v-if="globalStore.information?.isAwg">
            <FormHeading>{{ $t('wireguard.obfuscation.title') }}</FormHeading>

            <FormNullNumberField
              id="jC"
              v-model="data.jC"
              :label="$t('wireguard.obfuscation.jC.label')"
              :description="$t('wireguard.obfuscation.jC.description')"
            />
            <FormNullNumberField
              id="Jmin"
              v-model="data.jMin"
              :label="$t('wireguard.obfuscation.jMin.label')"
              :description="$t('wireguard.obfuscation.jMin.description')"
            />
            <FormNullNumberField
              id="Jmax"
              v-model="data.jMax"
              :label="$t('wireguard.obfuscation.jMax.label')"
              :description="$t('wireguard.obfuscation.jMax.description')"
            />

            <div class="col-span-full text-sm">
              * {{ $t('wireguard.obfuscation.mtuNote') }}
            </div>

            <FormNullTextField
              id="i1"
              v-model="data.i1"
              :label="$t('wireguard.obfuscation.i1.label')"
              :description="$t('wireguard.obfuscation.i1.description')"
            />
            <FormNullTextField
              id="i2"
              v-model="data.i2"
              :label="$t('wireguard.obfuscation.i2.label')"
              :description="$t('wireguard.obfuscation.i2.description')"
            />
            <FormNullTextField
              id="i3"
              v-model="data.i3"
              :label="$t('wireguard.obfuscation.i3.label')"
              :description="$t('wireguard.obfuscation.i3.description')"
            />
            <FormNullTextField
              id="i4"
              v-model="data.i4"
              :label="$t('wireguard.obfuscation.i4.label')"
              :description="$t('wireguard.obfuscation.i4.description')"
            />
            <FormNullTextField
              id="i5"
              v-model="data.i5"
              :label="$t('wireguard.obfuscation.i5.label')"
              :description="$t('wireguard.obfuscation.i5.description')"
            />

            <div class="col-span-full text-sm">
              {{ $t('wireguard.obfuscation.rangeNote') }}
            </div>

            <FormNullTextField
              id="contentPaddingAddition"
              v-model="data.contentPaddingAddition"
              :label="$t('wireguard.obfuscation.contentPaddingAddition.label')"
              :description="
                $t('wireguard.obfuscation.contentPaddingAddition.description')
              "
            />
            <FormNullTextField
              id="rekeyAfterTime"
              v-model="data.rekeyAfterTime"
              :label="$t('wireguard.obfuscation.rekeyAfterTime.label')"
              :description="
                $t('wireguard.obfuscation.rekeyAfterTime.description')
              "
            />
            <FormNullTextField
              id="rekeyTimeout"
              v-model="data.rekeyTimeout"
              :label="$t('wireguard.obfuscation.rekeyTimeout.label')"
              :description="
                $t('wireguard.obfuscation.rekeyTimeout.description')
              "
            />
            <FormNullTextField
              id="rejectAfterTime"
              v-model="data.rejectAfterTime"
              :label="$t('wireguard.obfuscation.rejectAfterTime.label')"
              :description="
                $t('wireguard.obfuscation.rejectAfterTime.description')
              "
            />
            <FormNullTextField
              id="keepaliveTimeout"
              v-model="data.keepaliveTimeout"
              :label="$t('wireguard.obfuscation.keepaliveTimeout.label')"
              :description="
                $t('wireguard.obfuscation.keepaliveTimeout.description')
              "
            />
            <FormNullTextField
              id="maxHandshakeAttempts"
              v-model="data.maxHandshakeAttempts"
              :label="$t('wireguard.obfuscation.maxHandshakeAttempts.label')"
              :description="
                $t('wireguard.obfuscation.maxHandshakeAttempts.description')
              "
            />
            <FormNullSwitchField
              id="disableCookies"
              v-model="data.disableCookies"
              :label="$t('wireguard.obfuscation.disableCookies.label')"
              :description="
                $t('wireguard.obfuscation.disableCookies.description')
              "
            />
          </FormGroup>
          <FormGroup>
            <FormHeading :description="$t('clients.hooks.description')">
              {{ $t('clients.hooks.title') }}
            </FormHeading>
            <FormTextArea
              id="PreUp"
              v-model="data.preUp"
              :description="$t('clients.hooks.fieldDescription')"
              :label="$t('wireguard.hooks.preUp')"
            />
            <FormTextArea
              id="PostUp"
              v-model="data.postUp"
              :description="$t('clients.hooks.fieldDescription')"
              :label="$t('wireguard.hooks.postUp')"
            />
            <FormTextArea
              id="PreDown"
              v-model="data.preDown"
              :description="$t('clients.hooks.fieldDescription')"
              :label="$t('wireguard.hooks.preDown')"
            />
            <FormTextArea
              id="PostDown"
              v-model="data.postDown"
              :description="$t('clients.hooks.fieldDescription')"
              :label="$t('wireguard.hooks.postDown')"
            />
          </FormGroup>
          <FormSaveControls class="col-span-full" @revert="revert" />
        </FormElement>
        <FormGroup class="mt-6">
          <FormHeading>{{ $t('common.form.actions') }}</FormHeading>
          <div
            class="col-span-full flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <ClientsConfigDialog :client-id="data.id">
              <BaseSecondaryButton as="span" class="w-full">
                {{ $t('clients.configuration.view') }}
              </BaseSecondaryButton>
            </ClientsConfigDialog>
            <ClientsKeyActionDialog
              :action="
                data.hasPreSharedKey ? 'rotatePreSharedKey' : 'addPreSharedKey'
              "
              :client-name="data.name"
              :disabled="keyActionPending"
              @confirm="changeKey('rotatePreSharedKey')"
            />
            <ClientsKeyActionDialog
              action="removePreSharedKey"
              :client-name="data.name"
              :disabled="keyActionPending || !data.hasPreSharedKey"
              @confirm="changeKey('removePreSharedKey')"
            />
            <ClientsKeyActionDialog
              action="rotateKeyPair"
              :client-name="data.name"
              :disabled="keyActionPending"
              @confirm="changeKey('rotateKeyPair')"
            />
            <ClientsDeleteDialog
              :client-name="data.name"
              @delete="deleteClient"
            >
              <BaseSecondaryButton as="span" class="ui-button-danger w-full">
                {{ $t('common.actions.delete') }}
              </BaseSecondaryButton>
            </ClientsDeleteDialog>
          </div>
        </FormGroup>
      </PanelBody>
    </Panel>
  </main>
</template>

<script lang="ts" setup>
import { CircleArrowLeftIcon } from '@lucide/vue';

import { $fetch } from '#imports';

const globalStore = useGlobalStore();

const route = useRoute();
const id = Number(route.params.id);

const { data: _data, refresh } = await useFetch(`/api/client/${id}`, {
  method: 'get',
});
const data = toRef(_data.value);
const keyActionPending = ref(false);
const { t } = useI18n();

const keyActions = {
  rotatePreSharedKey: () =>
    $fetch(`/api/client/${id}/preSharedKey`, { method: 'post' }),
  removePreSharedKey: () =>
    $fetch(`/api/client/${id}/preSharedKey`, { method: 'delete' }),
  rotateKeyPair: () =>
    $fetch(`/api/client/${id}/rotateKeyPair`, { method: 'post' }),
};

async function refreshKeys() {
  await refresh();
  if (data.value && _data.value) {
    data.value.publicKey = _data.value.publicKey;
    data.value.hasPreSharedKey = _data.value.hasPreSharedKey;
    data.value.endpoint = _data.value.endpoint;
  }
}

async function changeKey(action: keyof typeof keyActions) {
  if (keyActionPending.value) return;
  keyActionPending.value = true;
  try {
    await useSubmit(keyActions[action], {
      revert: refreshKeys,
      successMsg: t('clients.keys.updated'),
    })(undefined);
  } finally {
    keyActionPending.value = false;
  }
}

const _submit = useSubmit(
  (data) =>
    $fetch(`/api/client/${id}`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success) => {
      if (success) {
        await navigateTo('/');
      } else {
        await revert();
      }
    },
  }
);

function submit() {
  return _submit(data.value);
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}

const _deleteClient = useSubmit(
  (data) =>
    $fetch(`/api/client/${id}`, {
      method: 'delete',
      body: data,
    }),
  {
    revert: async () => {
      await navigateTo('/');
    },
  }
);

function deleteClient() {
  return _deleteClient(undefined);
}
</script>
