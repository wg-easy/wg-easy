<template>
  <FormArrayField v-model="items" :name="name">
    <template #empty>
      <div v-if="data === null">
        {{ emptyText || $t('common.form.nullNoItems') }}
      </div>
    </template>
  </FormArrayField>
</template>

<script lang="ts" setup>
const data = defineModel<string[] | null>();
defineProps<{ emptyText?: string[]; name: string }>();

const items = computed({
  get: () => (data.value === null ? [] : data.value),
  set: (value: string[] | undefined) => {
    data.value = value?.length === 0 ? null : value;
  },
});
</script>
