<template>
  <BaseDialog>
    <template #trigger>
      <BaseSecondaryButton v-if="enabled">
        {{ $t('client.enableSelected') }}
      </BaseSecondaryButton>
      <BasePrimaryButton v-else>
        {{ $t('client.disableSelected') }}
      </BasePrimaryButton>
    </template>
    <template #title>
      {{ $t(enabled ? 'client.enableSelected' : 'client.disableSelected') }}
    </template>
    <template #description>
      {{
        $t(
          enabled
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
        <BasePrimaryButton @click="$emit('confirm', enabled)">
          {{ $t(enabled ? 'client.enableSelected' : 'client.disableSelected') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineProps<{
  enabled: boolean;
  selectedCount: number;
}>();

defineEmits<{
  confirm: [enabled: boolean];
}>();
</script>
