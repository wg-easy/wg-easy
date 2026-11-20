<template>
  <p
    v-if="tagsStore.tags && tagsStore.tags.length === 0"
    class="p-10 text-center text-sm text-subtle"
  >
    {{ $t('admin.tags.empty') }}
  </p>
  <ul v-else class="divide-y divide-line">
    <li
      v-for="tag in tagsStore.tags"
      :key="tag.id"
      class="flex items-center justify-between gap-3 px-4 py-3"
    >
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-foreground">
          {{ tag.name }}
        </p>
        <p
          v-if="tag.description"
          class="mt-0.5 text-xs wrap-anywhere text-subtle"
        >
          {{ tag.description }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <AdminTagsEditDialog :tag="tag">
          <span class="icon-button" :title="$t('admin.tags.edit')">
            <SquarePenIcon class="size-4" />
            <span class="sr-only">{{ $t('admin.tags.edit') }}</span>
          </span>
        </AdminTagsEditDialog>
        <AdminTagsDeleteDialog :tag-name="tag.name" @delete="deleteTag(tag.id)">
          <span class="icon-button" :title="$t('admin.tags.delete.title')">
            <Trash2Icon class="size-4" />
            <span class="sr-only">{{ $t('admin.tags.delete.title') }}</span>
          </span>
        </AdminTagsDeleteDialog>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { SquarePenIcon, Trash2Icon } from '@lucide/vue';

import { $fetch } from '#imports';

const tagsStore = useTagsStore();
const { t } = useI18n();

const _deleteTag = useSubmit(
  (id: number) => $fetch(`/api/tag/${id}`, { method: 'delete' }),
  {
    revert: () => tagsStore.refresh(),
    successMsg: t('admin.tags.deleted'),
  }
);

function deleteTag(id: number) {
  return _deleteTag(id);
}
</script>
