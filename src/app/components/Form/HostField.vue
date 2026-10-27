<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <div class="flex min-w-0 flex-wrap gap-2">
    <BaseInput
      :id="id"
      v-model.trim="data"
      :name="id"
      type="text"
      class="w-full min-w-24 flex-1"
      :placeholder="placeholder"
    />
    <ClientOnly>
      <AdminSuggestDialog :url="url" @change="data = $event">
        <BasePrimaryButton as="span">
          <div class="flex items-center gap-3">
            <SparklesIcon class="size-4" />
            <span class="whitespace-nowrap">
              {{ $t('admin.config.suggest') }}
            </span>
          </div>
        </BasePrimaryButton>
      </AdminSuggestDialog>
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup>
import { SparklesIcon } from '@lucide/vue';

defineProps<{
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  url: '/api/admin/ip-info' | '/api/setup/4';
}>();

const data = defineModel<string | null>({
  set(value) {
    return value?.trim() || null;
  },
});
</script>
