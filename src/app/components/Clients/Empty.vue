<template>
  <div
    class="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line p-6 text-center"
  >
    <div
      class="grid size-12 place-items-center rounded-xl bg-surface-raised text-subtle"
    >
      <IconsStack class="size-6" />
    </div>
    <p class="text-sm text-muted">
      {{ $t(clientsStore.filter ? 'ui.noResults' : 'client.empty') }}
    </p>
    <BaseSecondaryButton
      v-if="clientsStore.filter"
      @click="clientsStore.setSearchQuery('')"
      >{{ $t('ui.clearSearch') }}</BaseSecondaryButton
    >
    <ClientsCreateDialog v-else
      ><BasePrimaryButton as="span"
        ><IconsPlus class="size-4" />{{ $t('client.new') }}</BasePrimaryButton
      ></ClientsCreateDialog
    >
  </div>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();
</script>
