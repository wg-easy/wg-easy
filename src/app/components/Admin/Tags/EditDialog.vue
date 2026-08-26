<template>
  <BaseDialog :trigger-class="triggerClass" @update:open="resetOnOpen">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('admin.tags.edit') }}
    </template>
    <template #description>
      <div class="flex flex-col">
        <FormTextField id="name" v-model="name" :label="$t('general.name')" />
        <FormNullTextField
          id="description"
          v-model="description"
          :label="$t('general.description')"
        />

        <div
          class="mb-1 mt-3 text-sm font-medium text-gray-700 dark:text-neutral-200"
        >
          {{ $t('admin.tags.clients') }}
        </div>
        <div
          class="max-h-56 overflow-y-auto rounded-lg border-2 border-gray-100 dark:border-neutral-800"
        >
          <IconsLoading
            v-if="!clients"
            class="mx-auto my-3 w-5 animate-spin"
          />
          <p
            v-else-if="clients.length === 0"
            class="p-3 text-center text-sm text-gray-400 dark:text-neutral-400"
          >
            {{ $t('client.empty') }}
          </p>
          <button
            v-for="client in clients"
            :key="client.id"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-600"
            @click="toggleClient(client)"
          >
            <CheckboxRoot
              :model-value="isAssigned(client)"
              class="pointer-events-none flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 data-[state=checked]:border-red-800 data-[state=checked]:bg-red-800 dark:border-neutral-500"
            >
              <CheckboxIndicator>
                <IconsCheck class="w-3 text-white" />
              </CheckboxIndicator>
            </CheckboxRoot>
            <span class="truncate">{{ client.name }}</span>
          </button>
        </div>
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="editTag">
          {{ $t('dialog.change') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import type { TypedInternalResponse } from 'nitropack/types';

type ClientWithTags = TypedInternalResponse<
  '/api/client',
  unknown,
  'get'
>[number];

const props = defineProps<{ triggerClass?: string; tag: LocalTag }>();

const name = ref(props.tag.name);
const description = ref(props.tag.description);
const clients = ref<ClientWithTags[] | null>(null);
const tagsStore = useTagsStore();

const { t } = useI18n();

function resetOnOpen(open: boolean) {
  if (!open) return;

  name.value = props.tag.name;
  description.value = props.tag.description;
  fetchClients();
}

async function fetchClients() {
  clients.value = await $fetch('/api/client');
}

function isAssigned(client: ClientWithTags) {
  return client.tags.some((clientTag) => clientTag.id === props.tag.id);
}

function toggleClient(client: ClientWithTags) {
  const currentTagIds = client.tags.map((clientTag) => clientTag.id);
  const tagIds = isAssigned(client)
    ? currentTagIds.filter((tagId) => tagId !== props.tag.id)
    : [...currentTagIds, props.tag.id];

  const submit = useSubmit(
    () =>
      $fetch(`/api/client/${client.id}`, {
        method: 'post',
        body: { ...client, tagIds },
      }),
    {
      noSuccessToast: true,
      revert: async (success) => {
        if (success) {
          await fetchClients();
        }
      },
    }
  );

  return submit(undefined);
}

function editTag() {
  return _editTag({ name: name.value, description: description.value });
}

const _editTag = useSubmit(
  (data) =>
    $fetch(`/api/tag/${props.tag.id}`, {
      method: 'post',
      body: data,
    }),
  {
    revert: () => tagsStore.refresh(),
    successMsg: t('admin.tags.updated'),
  }
);
</script>
