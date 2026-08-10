<template>
  <main>
    <FormElement @submit.prevent="createGroup">
      <FormGroup>
        <FormHeading>{{ $t('group.new') }}</FormHeading>
        <div class="col-span-full flex flex-wrap items-end gap-3">
          <div class="flex flex-col">
            <FormLabel for="new-name">{{ $t('group.name') }}</FormLabel>
            <BaseInput
              id="new-name"
              v-model.trim="newName"
              name="new-name"
              type="text"
            />
          </div>
          <div class="flex flex-col">
            <FormLabel for="new-color">{{ $t('group.color') }}</FormLabel>
            <input
              id="new-color"
              v-model="newColor"
              type="color"
              class="h-10 w-16 cursor-pointer rounded-lg border-2 border-gray-100 bg-transparent dark:border-neutral-800"
            />
          </div>
          <BasePrimaryButton type="submit" :disabled="!newName">
            {{ $t('group.create') }}
          </BasePrimaryButton>
        </div>
      </FormGroup>

      <FormGroup>
        <FormHeading>{{ $t('pages.admin.groups') }}</FormHeading>
        <p
          v-if="groups && groups.length === 0"
          class="col-span-full text-sm text-gray-500 dark:text-neutral-400"
        >
          {{ $t('group.empty') }}
        </p>
        <div
          v-for="group in groups"
          :key="group.id"
          class="col-span-full flex flex-wrap items-end gap-3 border-b border-gray-100 py-3 last:border-b-0 dark:border-neutral-600"
        >
          <div class="flex flex-col">
            <FormLabel :for="`name-${group.id}`">
              {{ $t('group.name') }}
            </FormLabel>
            <BaseInput
              :id="`name-${group.id}`"
              v-model.trim="group.name"
              :name="`name-${group.id}`"
              type="text"
            />
          </div>
          <div class="flex flex-col">
            <FormLabel :for="`color-${group.id}`">
              {{ $t('group.color') }}
            </FormLabel>
            <input
              :id="`color-${group.id}`"
              v-model="group.color"
              type="color"
              class="h-10 w-16 cursor-pointer rounded-lg border-2 border-gray-100 bg-transparent dark:border-neutral-800"
            />
          </div>
          <BasePrimaryButton @click="updateGroup(group)">
            {{ $t('form.save') }}
          </BasePrimaryButton>
          <BaseDialog>
            <template #trigger>
              <BaseSecondaryButton as="span">
                {{ $t('group.delete') }}
              </BaseSecondaryButton>
            </template>
            <template #title>{{ $t('group.deleteGroup') }}</template>
            <template #description>
              {{ $t('group.deleteDialog1') }}
              <strong>{{ group.name }}</strong
              >? {{ $t('group.deleteDialog2') }}
            </template>
            <template #actions>
              <DialogClose as-child>
                <BasePrimaryButton>{{ $t('dialog.cancel') }}</BasePrimaryButton>
              </DialogClose>
              <DialogClose as-child>
                <BaseSecondaryButton @click="deleteGroup(group.id)">
                  {{ $t('group.deleteGroup') }}
                </BaseSecondaryButton>
              </DialogClose>
            </template>
          </BaseDialog>
        </div>
      </FormGroup>
    </FormElement>
  </main>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const { t } = useI18n();
const toast = useToast();

const { data: groups, refresh } = await useFetch('/api/group', {
  method: 'get',
});

const DEFAULT_COLOR = '#3b82f6';
const newName = ref('');
const newColor = ref(DEFAULT_COLOR);

function handleError(e: unknown) {
  if (e instanceof FetchError) {
    toast.showToast({ type: 'error', message: e.data.message });
  } else if (e instanceof Error) {
    toast.showToast({ type: 'error', message: e.message });
  } else {
    console.error(e);
  }
}

async function createGroup() {
  if (!newName.value) {
    return;
  }
  try {
    await $fetch('/api/admin/group', {
      method: 'post',
      body: { name: newName.value, color: newColor.value },
    });
    toast.showToast({ type: 'success', message: t('group.created') });
    newName.value = '';
    newColor.value = DEFAULT_COLOR;
  } catch (e) {
    handleError(e);
  } finally {
    await refresh();
  }
}

async function updateGroup(group: {
  id: number;
  name: string;
  color: string | null;
}) {
  try {
    await $fetch(`/api/admin/group/${group.id}`, {
      method: 'post',
      body: { name: group.name, color: group.color },
    });
    toast.showToast({ type: 'success' });
  } catch (e) {
    handleError(e);
  } finally {
    await refresh();
  }
}

async function deleteGroup(id: number) {
  try {
    await $fetch(`/api/admin/group/${id}`, { method: 'delete' });
    toast.showToast({ type: 'success' });
  } catch (e) {
    handleError(e);
  } finally {
    await refresh();
  }
}
</script>
