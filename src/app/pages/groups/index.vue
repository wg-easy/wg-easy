<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle>{{ $t('clientGroup.title') }}</PanelHeadTitle>
        <PanelHeadBoat>
          <NuxtLink to="/groups/new">
            <BasePrimaryButton as="span">
              <IconsPlus class="mr-2 size-4" />
              {{ $t('clientGroup.create') }}
            </BasePrimaryButton>
          </NuxtLink>
        </PanelHeadBoat>
      </PanelHead>

      <PanelBody>
        <div v-if="pending" class="py-8 text-center">
          <IconsLoading class="mx-auto w-5 animate-spin" />
        </div>

        <div
          v-else-if="error"
          class="rounded border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ $t('clientGroup.loadError') }}
        </div>

        <div
          v-else-if="groupsStore.groups?.length === 0"
          class="rounded border border-dashed border-gray-200 p-6 text-center text-gray-500 dark:border-neutral-600 dark:text-neutral-300"
        >
          <p>{{ $t('clientGroup.empty') }}</p>
          <NuxtLink to="/groups/new" class="mt-4 inline-block">
            <BasePrimaryButton as="span">
              {{ $t('clientGroup.create') }}
            </BasePrimaryButton>
          </NuxtLink>
        </div>

        <div v-else>
          <div
            v-for="group in groupsStore.groups"
            :key="group.id"
            class="relative overflow-hidden border-b border-solid border-gray-100 last:border-b-0 dark:border-neutral-600"
          >
            <div
              class="relative flex flex-col justify-between gap-3 px-3 py-3 sm:flex-row sm:items-center md:py-5"
            >
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <h3
                  class="truncate font-semibold text-gray-700 dark:text-neutral-200"
                >
                  {{ group.name }}
                </h3>
                <div
                  class="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 dark:text-neutral-400"
                >
                  <span
                    v-if="hasDescription(group.description)"
                    class="min-w-0 break-words"
                  >
                    {{ group.description }}
                  </span>
                  <span class="shrink-0">
                    {{ formatClientCount(group.assignedClientCount) }}
                  </span>
                </div>
              </div>
              <div class="flex shrink-0 items-center justify-end">
                <div
                  class="flex items-center justify-between gap-1 text-gray-400 dark:text-neutral-400"
                >
                  <NuxtLink
                    :to="`/groups/${group.id}`"
                    class="rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-800 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
                    :aria-label="
                      $t('clientGroup.editGroupLabel', { name: group.name })
                    "
                    :title="$t('clientGroup.edit')"
                  >
                    <IconsEdit class="w-5" />
                  </NuxtLink>
                  <ClientGroupsDeleteDialog
                    trigger-class="rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-800 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
                    :trigger-aria-label="
                      $t('clientGroup.deleteGroupLabel', {
                        name: group.name,
                      })
                    "
                    :trigger-title="$t('clientGroup.delete')"
                    :group-name="group.name"
                    :assigned-client-count="group.assignedClientCount"
                    @delete="deleteGroup(group.id)"
                  >
                    <IconsDelete class="w-5" />
                  </ClientGroupsDeleteDialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
import { apiErrorMessage, pluralKey } from '../../utils/clientGroups';

const groupsStore = useClientGroupsStore();
const toast = useToast();
const { t } = useI18n();

const pending = ref(true);
const error = ref(false);

await loadGroups();

async function loadGroups() {
  pending.value = true;
  error.value = false;

  try {
    await groupsStore.refresh();
  } catch {
    error.value = true;
  } finally {
    pending.value = false;
  }
}

function formatClientCount(count: number) {
  return t(
    pluralKey(
      count,
      'clientGroup.clientCountOne',
      'clientGroup.clientCountOther'
    ),
    { count }
  );
}

function hasDescription(description: string | null | undefined) {
  return Boolean(description?.trim());
}

async function deleteGroup(groupId: number) {
  try {
    await groupsStore.deleteGroup(groupId);
    await groupsStore.refresh();
    toast.showToast({
      type: 'success',
      message: t('clientGroup.deleted'),
    });
  } catch (error) {
    toast.showToast({
      type: 'error',
      message: apiErrorMessage(error, t('toast.unknown')),
    });
  }
}
</script>
