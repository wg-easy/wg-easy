<template>
  <ClientsCreateDialog :trigger-class="triggerClass"
    ><BasePrimaryButton as="span" class="w-full"
      ><PlusIcon class="size-4" />{{ $t('client.new') }}</BasePrimaryButton
    ></ClientsCreateDialog
  >
</template>

<script setup lang="ts">
import { PlusIcon } from '@lucide/vue';

defineProps<{ triggerClass?: string }>();
</script>
