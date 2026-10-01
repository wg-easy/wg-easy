<template>
  <p
    v-if="tagsStore.tags && tagsStore.tags.length === 0"
    class="m-10 text-center text-sm text-gray-400 dark:text-neutral-400"
  >
    {{ $t('admin.tags.empty') }}
  </p>
  <div
    v-for="tag in tagsStore.tags"
    :key="tag.id"
    class="flex items-center justify-between gap-3 border-b border-solid border-gray-100 px-3 py-3 last:border-b-0 dark:border-neutral-600"
  >
    <div class="flex flex-col">
      <div class="text-sm text-gray-700 md:text-base dark:text-neutral-200">
        {{ tag.name }}
      </div>
      <div
        v-if="tag.description"
        class="text-xs text-gray-500 dark:text-neutral-400"
      >
        {{ tag.description }}
      </div>
    </div>
    <div
      class="flex shrink-0 items-center gap-2 text-gray-400 dark:text-neutral-400"
    >
      <AdminTagsEditDialog :tag="tag">
        <BaseSecondaryButton as="span" class="rounded p-2">
          <IconsEdit class="w-5" />
        </BaseSecondaryButton>
      </AdminTagsEditDialog>
      <AdminTagsDeleteDialog :tag-name="tag.name" @delete="deleteTag(tag.id)">
        <BaseSecondaryButton as="span" class="rounded p-2">
          <IconsDelete class="w-5" />
        </BaseSecondaryButton>
      </AdminTagsDeleteDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
const tagsStore = useTagsStore();
const { t } = useI18n();

function deleteTag(id: number) {
  const submit = useSubmit(
    () => $fetch<{ success: boolean }>(`/api/tag/${id}`, { method: 'delete' }),
    {
      revert: () => tagsStore.refresh(),
      successMsg: t('admin.tags.deleted'),
    }
  );

  return submit(undefined);
}
</script>
