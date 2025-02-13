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
              {{ $t('form.sectionGeneral') }}
            </FormHeading>
            <FormTextField
              id="name"
              v-model="data.name"
              :label="$t('general.name')"
            />
            <FormSwitchField
              id="enabled"
              v-model="data.enabled"
              :label="$t('client.enabled')"
            />
            <FormDateField
              id="expiresAt"
              v-model="data.expiresAt"
              :label="$t('client.expireDate')"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('client.address') }}</FormHeading>
            <FormTextField
              id="ipv4Address"
              v-model="data.ipv4Address"
              label="IPv4"
            />
            <FormTextField
              id="ipv6Address"
              v-model="data.ipv6Address"
              label="IPv6"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('general.allowedIps') }}</FormHeading>
            <FormArrayField v-model="data.allowedIps" name="allowedIps" />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('client.serverAllowedIps') }}</FormHeading>
            <FormArrayField
              v-model="data.serverAllowedIps"
              name="serverAllowedIps"
            />
          </FormGroup>
          <FormGroup></FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('form.sectionAdvanced') }}</FormHeading>
            <FormNumberField
              id="mtu"
              v-model="data.mtu"
              :label="$t('general.mtu')"
            />
            <FormNumberField
              id="persistentKeepalive"
              v-model="data.persistentKeepalive"
              :label="$t('general.persistentKeepalive')"
            />
          </FormGroup>
          <FormGroup>
            <FormHeading>{{ $t('form.actions') }}</FormHeading>
            <FormActionField type="submit" :label="$t('form.save')" />
            <FormActionField :label="$t('form.revert')" @click="revert" />
            <ClientsDeleteDialog
              trigger-class="col-span-2"
              :client-name="data.name"
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
const id = route.params.id as string;

const { data: _data, refresh } = await useFetch(`/api/client/${id}`, {
  method: 'get',
});
const data = toRef(_data.value);

const _submit = useSubmit(
  `/api/client/${id}`,
  {
    method: 'post',
  },
  async () => {
    router.push('/');
  }
);

function submit() {
  return _submit(data.value);
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}

const _deleteClient = useSubmit(
  `/api/client/${id}`,
  {
    method: 'delete',
  },
  async () => {
    router.push('/');
  }
);

function deleteClient() {
  return _deleteClient(undefined);
}
</script>
