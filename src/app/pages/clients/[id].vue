<template>
  <main v-if="data">
    <Panel>
      <PanelHead>
        <PanelHeadTitle :text="data.name" />
      </PanelHead>
      <PanelBody>
        <FormGroup>
          <FormHeading>
            {{ $t('me.sectionGeneral') }}
          </FormHeading>
          <FormTextField id="name" v-model.trim="data.name" label="Name" />
          <FormSwitchField
            id="enabled"
            v-model="data.enabled"
            label="Enabled"
          />
        </FormGroup>
        <FormGroup>
          <FormHeading>Address</FormHeading>
          <FormTextField id="ipv4" v-model.trim="data.address4" label="IPv4" />
          <FormTextField id="ipv6" v-model.trim="data.address6" label="IPv6" />
        </FormGroup>
        <FormGroup>
          <FormHeading>Allowed IPs</FormHeading>
          <FormArrayField v-model="data.allowedIPs" />
        </FormGroup>
        <FormGroup>
          <FormHeading>Server Allowed IPs</FormHeading>
          <FormArrayField v-model="data.serverAllowedIPs" />
        </FormGroup>
        <FormGroup></FormGroup>
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
          <FormActionField label="Delete!" />
          <FormActionField label="Revert!" @click="revert" />
        </FormGroup>
      </PanelBody>
    </Panel>
  </main>
</template>

<script lang="ts" setup>
const authStore = useAuthStore();
authStore.update();
const route = useRoute();
const id = route.params.id as string;
const { data: _data, refresh } = await useFetch(`/api/client/${id}`, {
  method: 'get',
});
const data = toRef(_data.value);

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}
</script>
