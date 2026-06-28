<template>
  <BaseDialog
    :trigger-class="triggerClass"
    :trigger-aria-label="triggerAriaLabel"
    :trigger-title="triggerTitle"
  >
    <template #trigger><slot /></template>
    <template #title>{{ $t('clientGroup.deleteGroup') }}</template>
    <template #description>
      <span>
        {{ $t('clientGroup.deleteConfirm', { name: groupName }) }}
      </span>
      <span v-if="assignedClientCount > 0" class="mt-2 block">
        {{
          $t(deleteAssignedConfirmKey, {
            count: assignedClientCount,
          })
        }}
      </span>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BasePrimaryButton>{{ $t('dialog.cancel') }}</BasePrimaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseSecondaryButton @click="$emit('delete')">
          {{ $t('clientGroup.deleteGroup') }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import { pluralKey } from '../../utils/clientGroups';

defineEmits<{
  delete: [];
}>();

const props = defineProps<{
  triggerClass?: string;
  triggerAriaLabel?: string;
  triggerTitle?: string;
  groupName: string;
  assignedClientCount: number;
}>();

const deleteAssignedConfirmKey = computed(() =>
  pluralKey(
    props.assignedClientCount,
    'clientGroup.deleteAssignedConfirmOne',
    'clientGroup.deleteAssignedConfirmOther'
  )
);
</script>
