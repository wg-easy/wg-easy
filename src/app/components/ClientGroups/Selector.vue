<template>
  <div class="col-span-full flex min-w-0 flex-col gap-2">
    <p
      v-if="selectedGroups.length === 0"
      class="text-sm text-gray-500 dark:text-neutral-300"
    >
      {{ $t('clientGroup.noGroupsSelected') }}
    </p>

    <div
      v-for="group in selectedGroups"
      :key="group.id"
      class="mt-1 flex min-w-0 flex-row gap-1"
    >
      <input
        :value="group.name"
        type="text"
        readonly
        class="min-w-0 rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
      />
      <button
        type="button"
        class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition hover:bg-red-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-800 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
        :aria-label="$t('clientGroup.removeGroupLabel', { name: group.name })"
        :title="$t('clientGroup.removeGroupLabel', { name: group.name })"
        @click="removeSelectedGroup(String(group.id))"
      >
        <IconsUnlink class="w-5" />
      </button>
    </div>

    <div class="mt-2 grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
      <select
        v-model="pendingGroupId"
        class="min-w-0 rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
        :disabled="disabled"
      >
        <option value="">{{ $t('clientGroup.selectGroup') }}</option>
        <option
          v-for="group in availableGroups"
          :key="group.id"
          :value="String(group.id)"
        >
          {{ group.name }}
        </option>
      </select>
      <BasePrimaryButton
        type="button"
        class="justify-center whitespace-nowrap rounded-lg"
        :disabled="disabled || !pendingGroupId"
        @click="addSelectedGroup"
      >
        {{ $t('form.add') }}
      </BasePrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  addGroupSelection,
  removeGroupSelection,
  selectedClientGroups,
  type ClientGroupPolicySource,
} from '../../utils/clientGroups';

const selectedGroupIds = defineModel<string[]>({ required: true });

const props = defineProps<{
  groups: ClientGroupPolicySource[] | null | undefined;
  disabled?: boolean;
}>();

const pendingGroupId = ref('');

const selectedGroups = computed(() =>
  selectedClientGroups(props.groups, selectedGroupIds.value)
);
const availableGroups = computed(() =>
  (props.groups ?? []).filter(
    (group) => !selectedGroupIds.value.includes(String(group.id))
  )
);

function addSelectedGroup() {
  selectedGroupIds.value = addGroupSelection(
    selectedGroupIds.value,
    pendingGroupId.value
  );
  pendingGroupId.value = '';
}

function removeSelectedGroup(groupId: string) {
  selectedGroupIds.value = removeGroupSelection(
    selectedGroupIds.value,
    groupId
  );
}
</script>
