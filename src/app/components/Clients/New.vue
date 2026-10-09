<template>
  <ClientsCreateDialog :trigger-class="triggerClass"
    ><BasePrimaryButton as="span" class="w-full"
      ><IconsPlus class="size-4" />{{ $t('client.new') }}</BasePrimaryButton
    ></ClientsCreateDialog
  >
</template>

<script setup lang="ts">
defineProps<{ triggerClass?: string }>();
</script>
