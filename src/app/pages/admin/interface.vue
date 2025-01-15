<template>
  <main v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormHeading>Interface Settings</FormHeading>
        <FormNumberField id="mtu" v-model="data.mtu" label="MTU" />
        <FormNumberField id="port" v-model="data.port" label="Port" />
        <FormTextField id="device" v-model="data.device" label="Device" />
      </FormGroup>
      <FormGroup>
        <FormHeading>Actions</FormHeading>
        <FormActionField type="submit" label="Save" />
        <FormActionField label="Revert" @click="revert" />
      </FormGroup>
    </FormElement>
  </main>
</template>

<script setup lang="ts">
const toast = useToast();

const { data: _data, refresh } = await useFetch(`/api/admin/interface`, {
  method: 'get',
});

const data = toRef(_data.value);

async function submit() {
  try {
    const res = await $fetch(`/api/admin/interface`, {
      method: 'post',
      body: data.value,
    });
    toast.showToast({
      type: 'success',
      title: 'Success',
      message: 'Saved',
    });
    if (!res.success) {
      throw new Error('Failed to save');
    }
    await refreshNuxtData();
  } catch (e) {
    if (e instanceof Error) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: e.message,
      });
    }
  }
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}
</script>
