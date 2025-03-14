<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <div class="flex">
    <BaseInput
      :id="id"
      v-model.trim="data"
      :name="id"
      type="text"
      class="w-full"
    />
    <AdminSuggestDialog @change="data = $event">
      <BaseButton as="span">
        <div class="flex items-center gap-3">
          <IconsSparkles class="w-4" />
          <span>{{ $t('admin.config.suggest') }}</span>
        </div>
      </BaseButton>
    </AdminSuggestDialog>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
}>();

const data = defineModel<string>();
</script>
