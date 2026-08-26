<template>
  <BaseDialog :trigger-class="triggerClass" @update:open="resetOnOpen">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('admin.tags.new') }}
    </template>
    <template #description>
      <div class="flex flex-col">
        <FormTextField id="name" v-model="name" :label="$t('general.name')" />
        <FormNullTextField
          id="description"
          v-model="description"
          :label="$t('general.description')"
        />
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="createTag">
          {{ $t('dialog.create') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
const name = ref<string>('');
const description = ref<string | null>(null);
const tagsStore = useTagsStore();

const { t } = useI18n();

defineProps<{ triggerClass?: string }>();

function resetOnOpen(open: boolean) {
  if (!open) return;

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
