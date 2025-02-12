<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger>
      <slot />
    </template>
    <template #title>
      {{ $t('newClient') }}
    </template>
    <template #description>
      <div class="flex flex-col">
        <FormTextField id="name" v-model="name" label="Name" />
        <FormDateField id="expiresAt" v-model="expiresAt" label="Expire Date" />
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseButton>{{ $t('cancel') }}</BaseButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseButton @click="createClient">{{ $t('create') }}</BaseButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import { FetchError } from 'ofetch';

const name = ref<string>('');
const expiresAt = ref<string | null>(null);
const toast = useToast();
const clientsStore = useClientsStore();

defineProps<{ triggerClass?: string }>();

async function createClient() {
  try {
    await $fetch('/api/client', {
      method: 'post',
      body: { name: name.value, expiresAt: expiresAt.value },
    });
    toast.showToast({
      type: 'success',
      title: 'Success',
      message: 'Client created',
    });
    await clientsStore.refresh();
  } catch (e) {
    if (e instanceof FetchError) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: e.data.message,
      });
    }
    // TODO: handle errors better
  }
}
</script>
