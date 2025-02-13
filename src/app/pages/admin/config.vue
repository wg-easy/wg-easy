<template>
  <main v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormHeading>{{ $t('admin.config.connection') }}</FormHeading>
        <FormTextField
          id="host"
          v-model="data.host"
          :label="$t('admin.config.host')"
          :description="$t('admin.config.hostDesc')"
        />
        <FormNumberField
          id="port"
          v-model="data.port"
          :label="$t('admin.generic.port')"
          :description="$t('admin.config.portDesc')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading :description="$t('admin.config.allowedIpsDesc')">{{
          $t('admin.config.allowedIps')
        }}</FormHeading>
        <FormArrayField
          v-model="data.defaultAllowedIps"
          name="defaultAllowedIps"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading :description="$t('admin.config.dnsDesc')">{{
          $t('admin.config.dns')
        }}</FormHeading>
        <FormArrayField v-model="data.defaultDns" name="defaultDns" />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('admin.config.advanced') }}</FormHeading>
        <FormNumberField
          id="defaultMtu"
          v-model="data.defaultMtu"
          :label="$t('admin.generic.mtu')"
          :description="$t('admin.config.mtuDesc')"
        />
        <FormNumberField
          id="defaultPersistentKeepalive"
          v-model="data.defaultPersistentKeepalive"
          :label="$t('admin.config.persistentKeepalive')"
          :description="$t('admin.config.persistentKeepaliveDesc')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('form.actions') }}</FormHeading>
        <FormActionField type="submit" :label="$t('form.save')" />
        <FormActionField :label="$t('form.revert')" @click="revert" />
      </FormGroup>
    </FormElement>
  </main>
</template>

<script lang="ts" setup>
const { data: _data, refresh } = await useFetch(`/api/admin/userconfig`, {
  method: 'get',
});

const data = toRef(_data.value);

const submit = useSubmit(
  `/api/admin/userconfig`,
  {
    method: 'post',
    body: data.value,
  },
  revert
);

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}
</script>
