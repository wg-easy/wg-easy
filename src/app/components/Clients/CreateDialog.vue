<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('client.new') }}
    </template>
    <template #description>
      <div class="flex flex-col">
        <FormTextField id="name" v-model="name" :label="$t('client.name')" />
        <FormDateField
          id="expiresAt"
          v-model="expiresAt"
          :label="$t('client.expireDate')"
        />
        <FormHeading class="mt-4">
          {{ $t('clientGroup.title') }}
        </FormHeading>
        <ClientGroupsSelector
          v-model="selectedGroupIds"
          :groups="groupsStore.groups"
        />
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="createClient">
          {{ $t('client.create') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import { groupIdsFromSelection } from '../../utils/clientGroups';

const name = ref<string>('');
const expiresAt = ref<string | null>(null);
const clientsStore = useClientsStore();
const groupsStore = useClientGroupsStore();
const selectedGroupIds = ref<string[]>([]);

const { t } = useI18n();

defineProps<{ triggerClass?: string }>();

await groupsStore.refresh();

function createClient() {
  return _createClient({
    name: name.value,
    expiresAt: expiresAt.value,
    groupIds: groupIdsFromSelection(selectedGroupIds.value),
  });
}

const _createClient = useSubmit(
  (data) =>
    $fetch('/api/client', {
      method: 'post',
      body: data,
    }),
  {
    revert: () => clientsStore.refresh(),
    successMsg: t('client.created'),
  }
);
</script>
