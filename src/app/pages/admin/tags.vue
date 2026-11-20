<template>
  <div class="surface overflow-hidden">
    <div class="flex items-center justify-end border-b border-line p-4">
      <AdminTagsCreateDialog>
        <BasePrimaryButton as="span">
          <PlusIcon class="size-4" />
          {{ $t('admin.tags.new') }}
        </BasePrimaryButton>
      </AdminTagsCreateDialog>
    </div>
    <AdminTagsList />
  </div>
</template>

<script setup lang="ts">
import { PlusIcon } from '@lucide/vue';
</script>
