<template>
  <BaseDialog>
    <template #trigger><slot /></template>
    <template #title>{{ $t('deleteClient') }}</template>
    <template #description>
      {{ $t('deleteDialog1') }}
      <strong>{{ 'test' }}</strong
      >? {{ $t('deleteDialog2') }}
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseButton>{{ $t('cancel') }}</BaseButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseButton @click="$emit('delete')">{{
          $t('deleteClient')
        }}</BaseButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['delete']);
defineProps<{ triggerClass?: string }>();
</script>
