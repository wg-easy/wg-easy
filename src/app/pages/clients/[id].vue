<template>
  <main v-if="data">
    <Panel>
      <PanelHead>
        <PanelHeadTitle :text="data.name" />
      </PanelHead>
      <PanelBody>
        <FormElement :action="submitAction" method="post">
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
            <FormDateField
              id="expiresAt"
              v-model.trim="data.expiresAt"
              label="Expire Date"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>Address</FormHeading>
            <FormTextField
              id="address4"
              v-model.trim="data.address4"
              label="IPv4"
            />
            <FormTextField
              id="address6"
              v-model.trim="data.address6"
              label="IPv6"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>Allowed IPs</FormHeading>
            <FormArrayField v-model="data.allowedIPs" name="allowedIPs" />
          </FormGroup>
          <FormGroup>
            <FormHeading>Server Allowed IPs</FormHeading>
            <FormArrayField
              v-model="data.serverAllowedIPs"
              name="serverAllowedIPs"
            />
          </FormGroup>
          <FormGroup></FormGroup>
          <FormGroup>
            <FormHeading>Advanced</FormHeading>
            <FormNumberField id="mtu" v-model="data.mtu" label="MTU" />
            <FormNumberField
              id="persistentKeepalive"
              v-model="data.persistentKeepalive"
              label="Persistent Keepalive"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>Actions</FormHeading>
            <FormActionField type="submit" label="Save" />
            <FormActionField label="Revert" @click="revert" />
            <FormActionField type="submit" formmethod="delete" label="Delete" />
          </FormGroup>
        </FormElement>
      </PanelBody>
    </Panel>
  </main>
</template>

<script lang="ts" setup>
const authStore = useAuthStore();
authStore.update();
const route = useRoute();
const id = route.params.id as string;

const submitAction = computed(() => `/api/client/${id}`);

const { data: _data, refresh } = await useFetch(`/api/client/${id}`, {
  method: 'get',
});
const data = toRef(_data.value);

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}
</script>
