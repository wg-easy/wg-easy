<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle>
          {{ group?.name ?? $t('clientGroup.details') }}
        </PanelHeadTitle>
        <PanelHeadBoat>
          <NuxtLink to="/groups">
            <BaseSecondaryButton as="span">
              {{ $t('clientGroup.backToGroups') }}
            </BaseSecondaryButton>
          </NuxtLink>
        </PanelHeadBoat>
      </PanelHead>
      <PanelBody>
        <div v-if="pending" class="py-8 text-center">
          <IconsLoading class="mx-auto w-5 animate-spin" />
        </div>

        <div
          v-else-if="loadError"
          class="rounded border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ loadError }}
        </div>

        <div v-else-if="group" class="space-y-8">
          <div
            v-if="formError"
            class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {{ formError }}
          </div>

          <ClientGroupsForm
            v-model="form"
            :submit-label="$t('form.save')"
            :show-firewall-ips="showFirewallIps"
            @submit="submit"
          >
            <template #actions>
              <FormSecondaryActionField
                :label="$t('form.revert')"
                @click="revert"
              />
              <ClientGroupsDeleteDialog
                trigger-class="col-span-2"
                :group-name="group.name"
                :assigned-client-count="group.assignedClientCount"
                @delete="deleteGroup"
              >
                <FormSecondaryActionField
                  as="span"
                  class="inline-block w-full"
                  :label="$t('clientGroup.deleteGroup')"
                />
              </ClientGroupsDeleteDialog>
            </template>
          </ClientGroupsForm>

          <section class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold">
                {{ $t('clientGroup.membership') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-neutral-300">
                {{
                  $t(assignedClientCountKey, {
                    count: group.assignedClientCount,
                  })
                }}
              </p>
            </div>

            <div
              class="rounded border border-gray-100 p-4 dark:border-neutral-600"
            >
              <label
                for="clientGroupAssign"
                class="mb-2 block font-medium text-gray-700 dark:text-neutral-100"
              >
                {{ $t('clientGroup.assignClient') }}
              </label>
              <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  id="clientGroupAssign"
                  v-model="selectedClientId"
                  class="w-full rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
                >
                  <option value="">
                    {{ $t('clientGroup.selectClient') }}
                  </option>
                  <option
                    v-for="client in assignableClients"
                    :key="client.id"
                    :value="String(client.id)"
                  >
                    {{ client.name }}{{ clientGroupSuffix(client.id) }}
                  </option>
                </select>

                <BasePrimaryButton
                  type="button"
                  :disabled="!selectedClientId"
                  class="justify-center whitespace-nowrap"
                  @click="assignSelectedClient"
                >
                  {{ $t('clientGroup.assignClient') }}
                </BasePrimaryButton>
              </div>
            </div>

            <div
              v-if="group.clients.length === 0"
              class="rounded border border-dashed border-gray-200 p-6 text-center text-gray-500 dark:border-neutral-600 dark:text-neutral-300"
            >
              {{ $t('clientGroup.noAssignedClients') }}
            </div>

            <div v-else class="grid gap-3">
              <article
                v-for="client in group.clients"
                :key="client.id"
                class="min-w-0 rounded border border-gray-100 p-4 dark:border-neutral-600"
              >
                <div
                  class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-[minmax(100px,1fr)_auto_minmax(120px,auto)_minmax(240px,1.5fr)_auto] lg:items-center"
                >
                  <div class="min-w-0 lg:order-1">
                    <NuxtLink
                      :to="`/clients/${client.id}`"
                      class="break-words font-semibold text-red-800 hover:underline dark:text-red-400"
                    >
                      {{ client.name }}
                    </NuxtLink>
                  </div>
                  <div class="flex shrink-0 justify-end lg:order-5">
                    <ClientGroupsConfirmMembershipDialog
                      trigger-class="inline-flex size-10 items-center justify-center rounded bg-gray-100 text-gray-400 transition hover:bg-red-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-800 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
                      :trigger-aria-label="$t('clientGroup.unassignClient')"
                      :trigger-title="$t('clientGroup.unassignClient')"
                      :title="$t('clientGroup.unassignClient')"
                      :description="
                        $t('clientGroup.unassignClientConfirm', {
                          name: client.name,
                        })
                      "
                      :confirm-label="$t('clientGroup.unassignClient')"
                      @confirm="unassignClient(client.id)"
                    >
                      <IconsUnlink class="w-5" />
                    </ClientGroupsConfirmMembershipDialog>
                  </div>
                  <span
                    class="col-span-full text-sm text-gray-500 lg:order-2 lg:col-auto dark:text-neutral-300"
                  >
                    {{
                      client.enabled
                        ? $t('client.enabled')
                        : $t('clientGroup.disabled')
                    }}
                  </span>
                  <span
                    class="col-span-full min-w-0 text-sm text-gray-500 lg:order-3 lg:col-auto dark:text-neutral-300"
                  >
                    IPv4:
                    <span
                      class="font-mono text-sm [overflow-wrap:anywhere] lg:whitespace-nowrap"
                    >
                      {{ client.ipv4Address }}
                    </span>
                  </span>
                  <span
                    class="col-span-full min-w-0 text-sm text-gray-500 lg:order-4 lg:col-auto dark:text-neutral-300"
                  >
                    IPv6:
                    <span
                      class="font-mono text-sm [overflow-wrap:anywhere] lg:whitespace-nowrap"
                    >
                      {{ client.ipv6Address }}
                    </span>
                  </span>
                </div>
              </article>
            </div>
          </section>
        </div>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
import {
  apiErrorMessage,
  clientGroupFormToPayload,
  clientGroupToForm,
  createClientGroupForm,
  groupIdsForClient,
  invalidDefinedPolicyKey,
  pluralKey,
} from '../../utils/clientGroups';
import type { ClientGroupDetails } from '../../stores/clientGroups';

const route = useRoute();
const groupId = route.params.id as string;
const groupsStore = useClientGroupsStore();
const clientsStore = useClientsStore();
const globalStore = useGlobalStore();
const toast = useToast();
const { t } = useI18n();

const group = ref<ClientGroupDetails | null>(null);
const form = ref(createClientGroupForm());
const pending = ref(true);
const loadError = ref('');
const formError = ref('');
const selectedClientId = ref('');

await load();

const assignableClients = computed(() => {
  const clients = clientsStore.clients ?? [];
  const membership = groupsStore.membership ?? [];

  return clients.filter(
    (client) =>
      !groupIdsForClient(membership, client.id).includes(group.value?.id ?? -1)
  );
});

const showFirewallIps = computed(
  () => globalStore.information?.firewallEnabled === true
);
const assignedClientCountKey = computed(() =>
  pluralKey(
    group.value?.assignedClientCount ?? 0,
    'clientGroup.assignedClientCountOne',
    'clientGroup.assignedClientCountOther'
  )
);

async function load() {
  pending.value = true;
  loadError.value = '';

  try {
    await Promise.all([
      groupsStore.refresh(),
      groupsStore.refreshMembership(),
      clientsStore.refresh(),
    ]);
    group.value = await groupsStore.getDetails(groupId);
    form.value = clientGroupToForm(group.value);
  } catch (error) {
    loadError.value = apiErrorMessage(error, t('clientGroup.loadError'));
  } finally {
    pending.value = false;
  }
}

function clientGroupSuffix(clientId: number) {
  const currentGroupIds = groupIdsForClient(
    groupsStore.membership ?? [],
    clientId
  );

  if (currentGroupIds.length === 0) {
    return '';
  }

  const currentGroups = currentGroupIds
    .map((currentGroupId) =>
      groupsStore.groups?.find((candidate) => candidate.id === currentGroupId)
    )
    .filter((candidate) => !!candidate);

  return currentGroups.length > 0
    ? ` (${currentGroups.map((currentGroup) => currentGroup.name).join(', ')})`
    : '';
}

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
    await groupsStore.updateGroup(groupId, payload);
    await load();
    toast.showToast({
      type: 'success',
      message: t('toast.saved'),
    });
  } catch (error) {
    formError.value = apiErrorMessage(error, t('toast.unknown'));
    toast.showToast({
      type: 'error',
      message: formError.value,
    });
  }
}

function revert() {
  if (group.value) {
    form.value = clientGroupToForm(group.value);
  }
}

async function assignSelectedClient() {
  const clientId = Number(selectedClientId.value);

  if (!clientId || !group.value) {
    return;
  }

  try {
    await groupsStore.assignClient(clientId, group.value.id);
    selectedClientId.value = '';
    await load();
    toast.showToast({
      type: 'success',
      message: t('clientGroup.clientAssigned'),
    });
  } catch (error) {
    toast.showToast({
      type: 'error',
      message: apiErrorMessage(error, t('toast.unknown')),
    });
  }
}

async function unassignClient(clientId: number) {
  if (!group.value) {
    return;
  }

  try {
    await groupsStore.removeClient(clientId, group.value.id);
    await load();
    toast.showToast({
      type: 'success',
      message: t('clientGroup.clientUnassigned'),
    });
  } catch (error) {
    toast.showToast({
      type: 'error',
      message: apiErrorMessage(error, t('toast.unknown')),
    });
  }
}

async function deleteGroup() {
  if (!group.value) {
    return;
  }

  try {
    await groupsStore.deleteGroup(group.value.id);
    toast.showToast({
      type: 'success',
      message: t('clientGroup.deleted'),
    });
    await navigateTo('/groups');
  } catch (error) {
    toast.showToast({
      type: 'error',
      message: apiErrorMessage(error, t('toast.unknown')),
    });
  }
}
</script>
