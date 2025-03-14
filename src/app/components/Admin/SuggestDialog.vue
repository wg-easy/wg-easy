<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('admin.config.suggest') }}</template>
    <template #description>
      <p v-if="status === 'pending'">
        {{ $t('general.loading') }}
      </p>
      <BaseSelect v-else v-model="selected" :options="values" />
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseButton>{{ $t('dialog.cancel') }}</BaseButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseButton @click="$emit('change', selected)">
          {{ $t('dialog.change') }}
        </BaseButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['change']);
defineProps<{
  triggerClass?: string;
}>();

const { data, status } = useFetch('/api/admin/ip-info', {
  method: 'get',
});

const selected = ref<string>();
const values = toRef(data.value);
</script>
