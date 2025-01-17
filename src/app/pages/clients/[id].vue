<template>
  <main v-if="data">
    <Panel>
      <PanelHead>
        <PanelHeadTitle :text="data.name" />
      </PanelHead>
      <PanelBody>
        <FormElement @submit.prevent="submit">
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
              id="ipv4Address"
              v-model.trim="data.ipv4Address"
              label="IPv4"
            />
            <FormTextField
              id="ipv6Address"
              v-model.trim="data.ipv6Address"
              label="IPv6"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>Allowed IPs</FormHeading>
            <FormArrayField v-model="data.allowedIps" name="allowedIps" />
          </FormGroup>
          <FormGroup>
            <FormHeading>Server Allowed IPs</FormHeading>
            <FormArrayField
              v-model="data.serverAllowedIps"
              name="serverAllowedIps"
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
            <ClientsDeleteDialog
              trigger-class="col-span-2"
              @delete="deleteClient"
            >
              <FormActionField label="Delete" class="w-full" />
            </ClientsDeleteDialog>
          </FormGroup>
        </FormElement>
      </PanelBody>
    </Panel>
  </main>
</template>

<script lang="ts" setup>
const authStore = useAuthStore();
authStore.update();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const id = route.params.id as string;

const { data: _data, refresh } = await useFetch(`/api/client/${id}`, {
  method: 'get',
});
const data = toRef(_data.value);

async function submit() {
  try {
    const res = await $fetch(`/api/client/${id}`, {
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
    router.push('/');
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

async function deleteClient() {
  try {
    const res = await $fetch(`/api/client/${id}`, {
      method: 'delete',
    });
    toast.showToast({
      type: 'success',
      title: 'Success',
      message: 'Deleted',
    });
    if (!res.success) {
      throw new Error('Failed to delete');
    }
    router.push('/');
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
</script>
