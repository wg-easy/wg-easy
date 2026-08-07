<template>
  <BaseDialog>
    <template #trigger>
      <BaseSwitch
        :model-value="state === 'enabled'"
        :indeterminate="state === 'mixed'"
        :title="
          $t(targetEnabled ? 'client.enableSelected' : 'client.disableSelected')
        "
        :aria-label="
          $t(targetEnabled ? 'client.enableSelected' : 'client.disableSelected')
        "
        @update:model-value="() => undefined"
      />
    </template>
    <template #title>
      {{
        $t(targetEnabled ? 'client.enableSelected' : 'client.disableSelected')
      }}
    </template>
    <template #description>
      {{
        $t(
          targetEnabled
            ? 'client.enableSelectedDescription'
            : 'client.disableSelectedDescription',
          [selectedCount]
        )
      }}
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="$emit('confirm', targetEnabled)">
          {{
            $t(
              targetEnabled ? 'client.enableSelected' : 'client.disableSelected'
            )
          }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import {
  getBulkToggleTargetEnabled,
  type SelectedClientEnabledState,
} from '../../utils/clientSelection';

const props = defineProps<{
  selectedCount: number;
  state: SelectedClientEnabledState;
}>();

const targetEnabled = computed(() => getBulkToggleTargetEnabled(props.state));

defineEmits<{
  confirm: [enabled: boolean];
}>();
</script>
