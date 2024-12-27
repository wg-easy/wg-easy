<template>
  <main v-if="data">
    <FormGroup>
      <FormHeading>Connection</FormHeading>
      <FormTextField id="host" v-model="data.host" label="Host" />
      <FormNumberField id="port" v-model="data.port" label="Port" />
    </FormGroup>
    <FormGroup>
      <FormHeading>Allowed IPs</FormHeading>
      <FormArrayField v-model="data.allowedIps" />
    </FormGroup>
    <FormGroup>
      <FormHeading>DNS</FormHeading>
      <FormArrayField v-model="data.defaultDns" />
    </FormGroup>
    <FormGroup>
      <FormHeading>Advanced</FormHeading>
      <FormNumberField id="mtu" v-model="data.mtu" label="MTU" />
      <FormNumberField
        id="keepalive"
        v-model="data.persistentKeepalive"
        label="Persistent Keepalive"
      />
    </FormGroup>
    <FormGroup>
      <FormHeading>Actions</FormHeading>
      <FormActionField label="Revert!" @click="revert" />
    </FormGroup>
  </main>
</template>

<script lang="ts" setup>
const { data: _data, refresh } = await useFetch(`/api/admin/userconfig`, {
  method: 'get',
});
const data = toRef(_data.value);

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}
</script>
