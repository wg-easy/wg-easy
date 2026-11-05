<template>
  <FormFieldLabel :id="id" :label="label" />
  <div class="flex min-w-0 flex-col items-start gap-2">
    <ul v-if="data.length > 0" class="flex w-full flex-wrap gap-1.5">
      <li v-for="tagId in data" :key="tagId" class="max-w-full">
        <BaseTag>
          {{ tagName(tagId) }}
          <template #action>
            <button
              type="button"
              class="-mr-1 grid size-4 shrink-0 place-items-center rounded-full hover:bg-accent/20"
              :aria-label="`${$t('common.actions.delete')} ${tagName(tagId)}`"
              @click="remove(tagId)"
            >
              <XIcon class="size-3" aria-hidden="true" />
            </button>
          </template>
        </BaseTag>
      </li>
    </ul>

    <PopoverRoot v-model:open="open">
      <PopoverTrigger
        :id="id"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <PlusIcon class="size-3.5" aria-hidden="true" />
        {{ $t('clients.fields.tags.add') }}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          :side-offset="6"
          :collision-padding="8"
          align="start"
          class="ui-menu z-[100] w-64 p-0"
        >
          <div class="border-b border-line p-2">
            <div class="relative">
              <SearchIcon
                class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <input
                v-model="search"
                type="text"
                :placeholder="$t('clients.fields.tags.search')"
                :aria-label="$t('clients.fields.tags.search')"
                class="ui-input min-h-9 py-1.5 pl-8 text-xs"
                @keydown.enter.prevent="createAndAssignTag"
              />
            </div>
          </div>
          <div class="max-h-56 overflow-y-auto p-1.5">
            <button
              v-if="canCreateTags && showCreateOption"
              type="button"
              class="ui-menu-item w-full text-left"
              @click="createAndAssignTag"
            >
              <PlusIcon class="size-3.5 shrink-0" aria-hidden="true" />
              <span class="truncate">
                {{ $t('clients.fields.tags.create', { name: search.trim() }) }}
              </span>
            </button>
            <label
              v-for="tag in filteredTags"
              :key="tag.id"
              class="ui-menu-item w-full"
            >
              <BaseCheckbox
                :model-value="isSelected(tag.id)"
                :label="tag.name"
                @update:model-value="toggle(tag.id)"
              />
              <span class="truncate">{{ tag.name }}</span>
            </label>
            <p
              v-if="filteredTags.length === 0 && !showCreateOption"
              class="px-3 py-2 text-sm text-subtle"
            >
              {{ $t('common.form.noItems') }}
            </p>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>

<script lang="ts" setup>
import { PlusIcon, SearchIcon, XIcon } from '@lucide/vue';

import { $fetch } from '#imports';

defineProps<{ id: string; label: string }>();

const data = defineModel<number[]>({ default: () => [] });

const tagsStore = useTagsStore();
const authStore = useAuthStore();
const { t } = useI18n();

const open = ref(false);
const search = ref('');

const canCreateTags = computed(
  () =>
    !!authStore.userData && hasPermissions(authStore.userData, 'tags', 'create')
);

function tagName(id: number) {
  return tagsStore.tags?.find((tag) => tag.id === id)?.name ?? String(id);
}

function isSelected(id: number) {
  return data.value.includes(id);
}

function toggle(id: number) {
  data.value = isSelected(id)
    ? data.value.filter((tagId) => tagId !== id)
    : [...data.value, id];
}

function remove(id: number) {
  data.value = data.value.filter((tagId) => tagId !== id);
}

const filteredTags = computed(() => {
  const query = search.value.trim().toLowerCase();
  const tags = tagsStore.tags ?? [];
  if (!query) {
    return tags;
  }
  return tags.filter((tag) => tag.name.toLowerCase().includes(query));
});

const showCreateOption = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) {
    return false;
  }
  return !(tagsStore.tags ?? []).some(
    (tag) => tag.name.toLowerCase() === query
  );
});

const _createAndAssignTag = useSubmit(
  (body) =>
    $fetch('/api/tag', {
      method: 'post',
      body,
    }),
  {
    successMsg: t('admin.tags.created'),
    revert: async (success, result) => {
      if (!success || !result) {
        return;
      }

      await tagsStore.refresh();
      data.value = [...data.value, result.tagId];
      search.value = '';
    },
  }
);

function createAndAssignTag() {
  const name = search.value.trim();
  if (!name || !canCreateTags.value || !showCreateOption.value) {
    return;
  }

  return _createAndAssignTag({ name, description: null });
}
</script>
