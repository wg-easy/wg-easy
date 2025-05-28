<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('admin.config.suggest') }}</template>
    <template #description>
      <div class="flex flex-col items-start gap-2">
        <p>{{ $t('admin.config.suggestDesc') }}</p>
        <p v-if="!data">
          {{ $t('general.loading') }}
        </p>
        <BaseSelect v-else v-model="selected" :options="data" />
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="$emit('change', selected)">
          {{ $t('dialog.change') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['change']);
const props = defineProps<{
  triggerClass?: string;
  url: '/api/admin/ip-info' | '/api/setup/4';
}>();

const { data } = useFetch(props.url, {
  method: 'get',
});

const selected = ref<string>();
</script>
