<template>
  <main v-if="data">
    <Panel>
      <PanelHead>
        <PanelHeadTitle>
          {{ data.name }}
        </PanelHeadTitle>
      </PanelHead>
      <PanelBody>
        <FormElement @submit.prevent="submit">
          <FormGroup>
            <FormHeading>
              {{ $t('form.sectionGeneral') }}
            </FormHeading>
            <FormTextField
              id="name"
              v-model="data.name"
              :label="$t('general.name')"
            />
            <FormSwitchField
              id="enabled"
              v-model="data.enabled"
              :label="$t('client.enabled')"
            />
            <FormDateField
              id="expiresAt"
              v-model="data.expiresAt"
              :description="$t('client.expireDateDesc')"
              :label="$t('client.expireDate')"
            />
          </FormGroup>
          <FormGroup v-if="canManageGroups">
            <FormHeading :description="$t('clientGroup.clientSelectorDesc')">
              {{ $t('clientGroup.title') }}
            </FormHeading>
            <ClientGroupsSelector
              v-model="selectedGroupIds"
              :groups="groupsStore.groups"
              :disabled="groupsLoading"
            />
            <p
              v-if="groupsLoading"
              class="text-sm text-gray-500 dark:text-neutral-300"
            >
              {{ $t('general.loading') }}
            </p>
            <p
              v-if="groupLoadError"
              class="text-sm text-red-700 dark:text-red-300"
            >
              {{ groupLoadError }}
            </p>
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('client.address') }}</FormHeading>
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
              :data="data.endpoint ?? $t('client.notConnected')"
              :label="$t('client.endpoint')"
              :description="$t('client.endpointDesc')"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading :description="$t('client.allowedIpsDesc')">
              {{ $t('general.allowedIps') }}
            </FormHeading>
            <p
              v-if="!isGroupManagedPolicy('allowedIps')"
              class="col-span-2 text-sm text-gray-500 dark:text-neutral-300"
            >
              {{ $t(effectivePolicyMessage('allowedIps')) }}
            </p>
            <FormNullArrayField
              v-if="!isGroupManagedPolicy('allowedIps')"
              v-model="data.allowedIps"
              name="allowedIps"
            />
            <ClientGroupsManagedPolicyValue
              v-else
              :message-key="effectivePolicyMessage('allowedIps')"
              :groups="draftEffectivePolicy?.allowedIps.groups ?? []"
              :value="draftEffectivePolicy?.allowedIps.value ?? []"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading :description="$t('client.serverAllowedIpsDesc')">
              {{ $t('client.serverAllowedIps') }}
            </FormHeading>
            <FormArrayField
              v-model="data.serverAllowedIps"
              name="serverAllowedIps"
            />
          </FormGroup>
          <FormGroup v-if="globalStore.information?.firewallEnabled">
            <FormHeading :description="$t('client.firewallIpsDesc')">
              {{ $t('client.firewallIps') }}
            </FormHeading>
            <p
              v-if="!isGroupManagedPolicy('firewallIps')"
              class="col-span-2 text-sm text-gray-500 dark:text-neutral-300"
            >
              {{ $t(effectivePolicyMessage('firewallIps')) }}
            </p>
            <FormNullArrayField
              v-if="!isGroupManagedPolicy('firewallIps')"
              v-model="data.firewallIps"
              name="firewallIps"
            />
            <ClientGroupsManagedPolicyValue
              v-else
              :message-key="effectivePolicyMessage('firewallIps')"
              :groups="draftEffectivePolicy?.firewallIps.groups ?? []"
              :value="draftEffectivePolicy?.firewallIps.value ?? []"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading :description="$t('client.dnsDesc')">
              {{ $t('general.dns') }}
            </FormHeading>
            <p
              v-if="!isGroupManagedPolicy('dns')"
              class="col-span-2 text-sm text-gray-500 dark:text-neutral-300"
            >
              {{ $t(effectivePolicyMessage('dns')) }}
            </p>
            <FormNullArrayField
              v-if="!isGroupManagedPolicy('dns')"
              v-model="data.dns"
              name="dns"
            />
            <ClientGroupsManagedPolicyValue
              v-else
              :message-key="effectivePolicyMessage('dns')"
              :groups="draftEffectivePolicy?.dns.groups ?? []"
              :value="draftEffectivePolicy?.dns.value ?? []"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('form.sectionAdvanced') }}</FormHeading>
            <FormNumberField
              id="mtu"
              v-model="data.mtu"
              :description="$t('client.mtuDesc')"
              :label="$t('general.mtu')"
            />
            <FormNumberField
              id="persistentKeepalive"
              v-model="data.persistentKeepalive"
              :description="$t('client.persistentKeepaliveDesc')"
              :label="$t('general.persistentKeepalive')"
            />
          </FormGroup>
          <FormGroup v-if="globalStore.information?.isAwg">
            <FormHeading>{{ $t('awg.obfuscationParameters') }}</FormHeading>

            <FormNullNumberField
              id="jC"
              v-model="data.jC"
              :label="$t('awg.jCLabel')"
              :description="$t('awg.jCDescription')"
            />
            <FormNullNumberField
              id="Jmin"
              v-model="data.jMin"
              :label="$t('awg.jMinLabel')"
              :description="$t('awg.jMinDescription')"
            />
            <FormNullNumberField
              id="Jmax"
              v-model="data.jMax"
              :label="$t('awg.jMaxLabel')"
              :description="$t('awg.jMaxDescription')"
            />

            <div class="col-span-full text-sm">* {{ $t('awg.mtuNote') }}</div>

            <FormNullTextField
              id="i1"
              v-model="data.i1"
              :label="$t('awg.i1Label')"
              :description="$t('awg.i1Description')"
            />
            <FormNullTextField
              id="i2"
              v-model="data.i2"
              :label="$t('awg.i2Label')"
              :description="$t('awg.i2Description')"
            />
            <FormNullTextField
              id="i3"
              v-model="data.i3"
              :label="$t('awg.i3Label')"
              :description="$t('awg.i3Description')"
            />
            <FormNullTextField
              id="i4"
              v-model="data.i4"
              :label="$t('awg.i4Label')"
              :description="$t('awg.i4Description')"
            />
            <FormNullTextField
              id="i5"
              v-model="data.i5"
              :label="$t('awg.i5Label')"
              :description="$t('awg.i5Description')"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading :description="$t('client.hooksDescription')">
              {{ $t('client.hooks') }}
            </FormHeading>
            <FormTextArea
              id="PreUp"
              v-model="data.preUp"
              :description="$t('client.hooksLeaveEmpty')"
              :label="$t('hooks.preUp')"
            />
            <FormTextArea
              id="PostUp"
              v-model="data.postUp"
              :description="$t('client.hooksLeaveEmpty')"
              :label="$t('hooks.postUp')"
            />
            <FormTextArea
              id="PreDown"
              v-model="data.preDown"
              :description="$t('client.hooksLeaveEmpty')"
              :label="$t('hooks.preDown')"
            />
            <FormTextArea
              id="PostDown"
              v-model="data.postDown"
              :description="$t('client.hooksLeaveEmpty')"
              :label="$t('hooks.postDown')"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('form.actions') }}</FormHeading>
            <FormPrimaryActionField type="submit" :label="$t('form.save')" />
            <FormSecondaryActionField
              :label="$t('form.revert')"
              @click="revert"
            />
            <ClientsDeleteDialog
              trigger-class="col-span-2"
              :client-name="data.name"
              @delete="deleteClient"
            >
              <FormSecondaryActionField
                :label="$t('client.delete')"
                class="inline-block w-full"
                as="span"
              />
            </ClientsDeleteDialog>
            <ClientsConfigDialog
              trigger-class="col-span-2"
              :client-id="data.id"
            >
              <FormSecondaryActionField
                :label="$t('client.viewConfig')"
                class="inline-block w-full"
                as="span"
              />
            </ClientsConfigDialog>
          </FormGroup>
        </FormElement>
      </PanelBody>
    </Panel>
  </main>
</template>

<script lang="ts" setup>
import {
  apiErrorMessage,
  effectivePolicyMessageKey,
  groupSelectionFromMembership,
  saveClientGroupMembership,
  selectedClientGroups,
  type ClientGroupPolicyKey,
} from '../../utils/clientGroups';

import { resolveClientEffectivePolicy } from '#shared/utils/clientPolicy';
import { hasPermissions } from '#shared/utils/permissions';

const globalStore = useGlobalStore();
const authStore = useAuthStore();
const groupsStore = useClientGroupsStore();
const toast = useToast();
const { t } = useI18n();

const route = useRoute();
const id = route.params.id as string;

const { data: _data, refresh } = await useFetch(`/api/client/${id}`, {
  method: 'get',
});
const data = toRef(_data.value);
const selectedGroupIds = ref<string[]>([]);
const initialSelectedGroupIds = ref<string[]>([]);
const groupsLoading = ref(false);
const groupLoadError = ref('');
const userConfig = ref<{
  defaultAllowedIps: string[];
  defaultDns: string[];
} | null>(null);
const selectedGroups = computed(() =>
  selectedClientGroups(groupsStore.groups, selectedGroupIds.value)
);
const draftEffectivePolicy = computed(() => {
  if (!data.value || !userConfig.value) {
    return null;
  }

  return resolveClientEffectivePolicy({
    client: {
      allowedIps: data.value.allowedIps,
      dns: data.value.dns,
      firewallIps: data.value.firewallIps,
    },
    groups: selectedGroups.value,
    userConfig: userConfig.value,
    firewallEnabled: globalStore.information?.firewallEnabled === true,
  }).fields;
});

const canManageGroups = computed(() => {
  return (
    authStore.userData && hasPermissions(authStore.userData, 'admin', 'any')
  );
});

if (canManageGroups.value && data.value) {
  await loadClientGroups();
}

async function submit() {
  try {
    await $fetch(`/api/client/${id}`, {
      method: 'post',
      body: data.value,
    });
  } catch (error) {
    toast.showToast({
      type: 'error',
      message: apiErrorMessage(error, t('toast.unknown')),
    });
    await revert();
    return;
  }

  try {
    if (canManageGroups.value && data.value) {
      await saveClientGroupMembership(
        data.value.id,
        initialSelectedGroupIds.value,
        selectedGroupIds.value,
        {
          setGroups: groupsStore.setClientGroups,
        }
      );
      await groupsStore.refreshMembership();
      syncSelectedGroup();
    }
  } catch (error) {
    toast.showToast({
      type: 'error',
      message: t('clientGroup.membershipSaveError', {
        message: apiErrorMessage(error, t('toast.unknown')),
      }),
    });
    return;
  }

  toast.showToast({
    type: 'success',
    message: t('toast.saved'),
  });
  await navigateTo('/');
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
  syncSelectedGroup();
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

async function loadClientGroups() {
  groupsLoading.value = true;
  groupLoadError.value = '';

  try {
    await Promise.all([
      groupsStore.refresh(),
      groupsStore.refreshMembership(),
      refreshUserConfig(),
    ]);
    syncSelectedGroup();
  } catch (error) {
    groupLoadError.value = apiErrorMessage(error, t('clientGroup.loadError'));
  } finally {
    groupsLoading.value = false;
  }
}

function syncSelectedGroup() {
  if (!data.value) {
    selectedGroupIds.value = [];
    initialSelectedGroupIds.value = [];
    return;
  }

  const currentSelection = groupSelectionFromMembership(
    groupsStore.membership ?? [],
    data.value.id
  );
  selectedGroupIds.value = currentSelection;
  initialSelectedGroupIds.value = currentSelection;
}

function isGroupManagedPolicy(key: ClientGroupPolicyKey) {
  if (
    key === 'firewallIps' &&
    globalStore.information?.firewallEnabled !== true
  ) {
    return false;
  }

  return selectedGroupIds.value.length > 0;
}

function effectivePolicyMessage(key: ClientGroupPolicyKey) {
  const field = draftEffectivePolicy.value?.[key];

  return field
    ? effectivePolicyMessageKey(field)
    : 'clientGroup.inheritedFromGlobal';
}

async function refreshUserConfig() {
  userConfig.value = await $fetch<{
    defaultAllowedIps: string[];
    defaultDns: string[];
  }>('/api/admin/userconfig');
}
</script>
