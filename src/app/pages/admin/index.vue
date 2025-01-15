<template>
  <main v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormNumberField
          id="session"
          v-model="data.sessionTimeout"
          label="Session Timeout"
        />
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

const { data: _data, refresh } = await useFetch(`/api/admin/general`, {
  method: 'get',
});

const data = toRef(_data.value);

async function submit() {
  try {
    const res = await $fetch(`/api/admin/general`, {
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
