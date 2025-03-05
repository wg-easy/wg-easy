<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('client.deleteClient') }}</template>
    <template #description>
      {{ $t('client.deleteDialog1') }}
      <strong>{{ clientName }}</strong
      >? {{ $t('client.deleteDialog2') }}
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseButton>{{ $t('dialog.cancel') }}</BaseButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseButton @click="$emit('delete')">{{
          $t('client.deleteClient')
        }}</BaseButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['delete']);
defineProps<{ triggerClass?: string; clientName: string }>();
</script>
