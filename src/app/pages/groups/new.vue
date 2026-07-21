<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle>{{ $t('clientGroup.create') }}</PanelHeadTitle>
      </PanelHead>
      <PanelBody>
        <div
          v-if="formError"
          class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ formError }}
        </div>
        <ClientGroupsForm
          v-model="form"
          :submit-label="$t('clientGroup.create')"
          :show-firewall-ips="showFirewallIps"
          @submit="submit"
        >
          <template #actions>
            <NuxtLink to="/groups" class="col-span-2">
              <FormSecondaryActionField
                as="span"
                class="inline-flex w-full justify-center"
                :label="$t('dialog.cancel')"
              />
            </NuxtLink>
          </template>
        </ClientGroupsForm>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
import {
  apiErrorMessage,
  clientGroupFormToPayload,
  createClientGroupForm,
  invalidDefinedPolicyKey,
} from '../../utils/clientGroups';

const groupsStore = useClientGroupsStore();
const globalStore = useGlobalStore();
const toast = useToast();
const { t } = useI18n();

const form = ref(createClientGroupForm());
const formError = ref('');
const showFirewallIps = computed(
  () => globalStore.information?.firewallEnabled === true
);

async function submit() {
  const payload = clientGroupFormToPayload(form.value);

  if (!payload.name) {
    formError.value = t('clientGroup.nameRequired');
    return;
  }

  if (invalidDefinedPolicyKey(form.value, showFirewallIps.value)) {
    formError.value = t('clientGroup.policyRequired');
    return;
  }

  formError.value = '';

  try {
    await groupsStore.createGroup(payload);
    await groupsStore.refresh();
    toast.showToast({
      type: 'success',
      message: t('clientGroup.created'),
    });
    await navigateTo('/groups');
  } catch (error) {
    formError.value = apiErrorMessage(error, t('toast.unknown'));
    toast.showToast({
      type: 'error',
      message: formError.value,
    });
  }
}
</script>
