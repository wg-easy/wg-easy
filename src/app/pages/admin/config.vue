<template>
  <main v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormHeading>Connection</FormHeading>
        <FormTextField id="host" v-model="data.host" label="Host" />
        <FormNumberField id="port" v-model="data.port" label="Port" />
      </FormGroup>
      <FormGroup>
        <FormHeading>Allowed IPs</FormHeading>
        <FormArrayField
          v-model="data.defaultAllowedIps"
          name="defaultAllowedIps"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading>DNS</FormHeading>
        <FormArrayField v-model="data.defaultDns" name="defaultDns" />
      </FormGroup>
      <FormGroup>
        <FormHeading>Advanced</FormHeading>
        <FormNumberField
          id="defaultMtu"
          v-model="data.defaultMtu"
          label="MTU"
        />
        <FormNumberField
          id="defaultPersistentKeepalive"
          v-model="data.defaultPersistentKeepalive"
          label="Persistent Keepalive"
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

<script lang="ts" setup>
const toast = useToast();

const { data: _data, refresh } = await useFetch(`/api/admin/userconfig`, {
  method: 'get',
});

const data = toRef(_data.value);

async function submit() {
  try {
    const res = await $fetch(`/api/admin/userconfig`, {
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
