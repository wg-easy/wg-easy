<template>
  <BaseDialog :trigger-class="triggerClass" @update:open="resetOnOpen">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('admin.tags.new') }}
    </template>
    <template #description>
      <div class="flex flex-col gap-2">
        <FormTextField
          id="tagName"
          v-model="name"
          :label="$t('common.fields.name')"
        />
        <FormNullTextField
          id="tagDescription"
          v-model="description"
          :label="$t('common.fields.description')"
        />
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>
          {{ $t('common.actions.cancel') }}
        </BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton :disabled="!name.trim()" @click="createTag">
          {{ $t('common.actions.create') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import { $fetch } from '#imports';

const name = ref<string>('');
const description = ref<string | null>(null);
const tagsStore = useTagsStore();

const { t } = useI18n();

defineProps<{ triggerClass?: string }>();

function resetOnOpen(open: boolean) {
  if (!open) {
    return;
  }

  name.value = '';
  description.value = null;
}

function createTag() {
  return _createTag({ name: name.value, description: description.value });
}

const _createTag = useSubmit(
  (data) =>
    $fetch('/api/tag', {
      method: 'post',
      body: data,
    }),
  {
    revert: () => tagsStore.refresh(),
    successMsg: t('admin.tags.created'),
  }
);
</script>
