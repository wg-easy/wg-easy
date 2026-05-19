<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('client.duplicate') }}
    </template>
    <template #description>
      <div class="flex flex-col">
        <FormTextField id="name" v-model="name" :label="$t('client.name')" />
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="duplicateClient">
          {{ $t('client.create') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
//const name = ref<string>('');
//const name = computed(() => `${props.client.name}`);
const clientsStore = useClientsStore();

const { t } = useI18n();

const props = defineProps<{triggerClass?: string ; name?: string; client: LocalClient}>();
const name = ref<string>(`${props.client.name}`);
  
function duplicateClient() {
  return _duplicateClient({ name: name.value});
}

const _duplicateClient = useSubmit(
  `/api/client/${props.client.id}/duplicate`,
  {
    method: 'post',
  },
  {
    revert: () => clientsStore.refresh(),
    successMsg: t('client.created'),
  }
);
</script>
