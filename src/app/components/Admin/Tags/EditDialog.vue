<template>
  <BaseDialog :trigger-class="triggerClass" @update:open="resetOnOpen">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('admin.tags.edit') }}
    </template>
    <template #description>
      <div class="flex flex-col gap-2">
        <FormTextField
          :id="`tagName-${tag.id}`"
          v-model="name"
          :label="$t('common.fields.name')"
        />
        <FormNullTextField
          :id="`tagDescription-${tag.id}`"
          v-model="description"
          :label="$t('common.fields.description')"
        />

        <p class="mt-2 text-sm font-medium text-muted">
          {{ $t('admin.tags.clients') }}
        </p>
        <div
          class="max-h-56 overflow-y-auto rounded-lg border border-line bg-input p-1.5"
        >
          <LoaderCircleIcon
            v-if="!clients"
            class="mx-auto my-3 size-5 animate-spin text-subtle"
            aria-hidden="true"
          />
          <p
            v-else-if="clients.length === 0"
            class="p-3 text-center text-sm text-subtle"
          >
            {{ $t('clients.list.empty') }}
          </p>
          <template v-else>
            <label
              v-for="client in clients"
              :key="client.id"
              class="ui-menu-item"
            >
              <BaseCheckbox
                :model-value="isAssigned(client)"
                :label="client.name"
                :disabled="pending.has(client.id)"
                @update:model-value="toggleClient(client)"
              />
              <span class="truncate">{{ client.name }}</span>
            </label>
          </template>
        </div>
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>
          {{ $t('common.actions.cancel') }}
        </BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton :disabled="!name.trim()" @click="editTag">
          {{ $t('common.actions.save') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import { LoaderCircleIcon } from '@lucide/vue';

import { $fetch } from '#imports';

const props = defineProps<{ triggerClass?: string; tag: LocalTag }>();

const name = ref(props.tag.name);
const description = ref(props.tag.description);
const clients = ref<ApiClient[] | null>(null);
const pending = ref(new Set<number>());
const tagsStore = useTagsStore();

const { t } = useI18n();

// The API pages clients (max 100 per page); assignment needs all of them.
async function fetchAllClients() {
  const all: ApiClient[] = [];
  for (let page = 1; ; page++) {
    const result = await $fetch('/api/client', {
      query: { page, pageSize: 100 },
    });
    all.push(...result.clients);
    // The server clamps out-of-range pages, so stop on the last one.
    if (result.page !== page || all.length >= result.total) {
      return all;
    }
  }
}

async function resetOnOpen(open: boolean) {
  if (!open) {
    return;
  }

  name.value = props.tag.name;
  description.value = props.tag.description;
  clients.value = null;
  try {
    clients.value = await fetchAllClients();
  } catch (error) {
    clients.value = [];
    console.error(error);
  }
}

function isAssigned(client: ApiClient) {
  return client.tags.some((clientTag) => clientTag.id === props.tag.id);
}

async function toggleClient(client: ApiClient) {
  if (pending.value.has(client.id)) {
    return;
  }
  const assigned = isAssigned(client);
  const tags = assigned
    ? client.tags.filter((clientTag) => clientTag.id !== props.tag.id)
    : [...client.tags, props.tag];

  pending.value.add(client.id);
  try {
    await useSubmit(
      () =>
        $fetch(`/api/client/${client.id}`, {
          method: 'post',
          body: { ...client, tagIds: tags.map((clientTag) => clientTag.id) },
        }),
      {
        noSuccessToast: true,
        revert: async (success) => {
          if (success) {
            client.tags = tags;
          }
        },
      }
    )(undefined);
  } finally {
    pending.value.delete(client.id);
  }
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
