<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
  </div>
  <div class="flex flex-col items-start gap-2">
    <div v-if="data && data.length > 0" class="flex w-full flex-wrap gap-2">
      <span
        v-for="tagId in data"
        :key="tagId"
        class="flex items-center gap-1.5 rounded-full border border-red-800 bg-white py-1 pl-2.5 pr-1.5 text-xs text-gray-700 dark:border-red-700 dark:bg-neutral-700 dark:text-neutral-200"
      >
        {{ tagName(tagId) }}
        <button
          type="button"
          class="rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-neutral-600"
          @click="remove(tagId)"
        >
          <IconsClose class="w-3" />
        </button>
      </span>
    </div>

    <PopoverRoot v-model:open="open">
      <PopoverTrigger
        :id="id"
        class="inline-flex items-center gap-1 rounded bg-red-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
      >
        <IconsPlus class="w-3" />
        {{ $t('form.addTag') }}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          :side-offset="5"
          align="start"
          class="z-[100] w-56 overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-700 shadow-xl dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
        >
          <div class="p-2 pb-1">
            <div class="relative">
              <IconsMagnifyingGlass
                class="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400 dark:text-neutral-400"
              />
              <input
                v-model="search"
                type="text"
                :placeholder="$t('form.searchOrCreateTag')"
                class="w-full rounded-lg border-2 border-gray-100 py-1 pl-7 pr-3 text-xs text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
              />
            </div>
          </div>
          <div class="max-h-56 overflow-y-auto p-1 pt-0">
            <button
              v-if="canCreateTags && showCreateOption"
              type="button"
              class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-600"
              @click="createAndAssignTag"
            >
              <IconsPlus class="w-3 shrink-0" />
              <span class="truncate">
                {{ $t('form.createNewTag', { name: search.trim() }) }}
              </span>
            </button>
            <button
              v-for="tag in filteredTags"
              :key="tag.id"
              type="button"
              class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-600"
              @click="toggle(tag.id)"
            >
              <CheckboxRoot
                :model-value="isSelected(tag.id)"
                class="pointer-events-none flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 data-[state=checked]:border-red-800 data-[state=checked]:bg-red-800 dark:border-neutral-500"
              >
                <CheckboxIndicator>
                  <IconsCheck class="w-3 text-white" />
                </CheckboxIndicator>
              </CheckboxRoot>
              <span class="truncate">{{ tag.name }}</span>
            </button>
            <div
              v-if="filteredTags.length === 0 && !showCreateOption"
              class="px-2 py-1.5 text-sm text-gray-400 dark:text-neutral-400"
            >
              {{ $t('form.noItems') }}
            </div>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string }>();

const data = defineModel<number[]>({ default: () => [] });

const tagsStore = useTagsStore();
const authStore = useAuthStore();
const { t } = useI18n();

const open = ref(false);
const search = ref('');

const canCreateTags = computed(
  () =>
    !!authStore.userData &&
    hasPermissions(authStore.userData, 'tags', 'create')
);

function tagName(id: number) {
  return tagsStore.tags?.find((tag) => tag.id === id)?.name ?? id;
}

function isSelected(id: number) {
  return data.value?.includes(id) ?? false;
}

function toggle(id: number) {
  if (isSelected(id)) {
    remove(id);
  } else {
    data.value = [...(data.value ?? []), id];
  }
}

function remove(id: number) {
  data.value = (data.value ?? []).filter((tagId) => tagId !== id);
}

const filteredTags = computed(() => {
  const query = search.value.trim().toLowerCase();
  const tags = tagsStore.tags ?? [];
  if (!query) return tags;
  return tags.filter((tag) => tag.name.toLowerCase().includes(query));
});

const showCreateOption = computed(() => {
  const query = search.value.trim();
  if (!query) return false;
  return !(tagsStore.tags ?? []).some(
    (tag) => tag.name.toLowerCase() === query.toLowerCase()
  );
});

const _createAndAssignTag = useSubmit(
  (body) => $fetch('/api/tag', { method: 'post', body }),
  {
    successMsg: t('admin.tags.created'),
    revert: async (success, result) => {
      if (!success || !result) return;

      await tagsStore.refresh();
      data.value = [...(data.value ?? []), result.tagId];
      search.value = '';
    },
  }
);

function createAndAssignTag() {
  const name = search.value.trim();
  if (!name) return;

  return _createAndAssignTag({ name, description: null });
}
</script>
