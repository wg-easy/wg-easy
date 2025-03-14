<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('admin.config.suggest') }}</template>
    <template #description>
      <p v-if="!values">
        {{ $t('general.loading') }}
      </p>
      <div v-else class="flex flex-col items-start gap-2">
        <p>{{ $t('admin.config.suggestDesc') }}</p>
        <BaseSelect v-model="selected" :options="values" />
      </div>
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
const props = defineProps<{
  triggerClass?: string;
  url: '/api/admin/ip-info' | '/api/setup/4';
}>();

const { data } = await useFetch(props.url, {
  method: 'get',
});

const selected = ref<string>();
const values = toRef(data.value);
</script>
