<template>
  <div v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormHeading>{{ $t('admin.config.connection') }}</FormHeading>
        <FormHostField
          id="host"
          v-model="data.host"
          :label="$t('wireguard.fields.host')"
          :description="$t('admin.config.host.description')"
          url="/api/admin/ip-info"
        />
        <FormNumberField
          id="port"
          v-model="data.port"
          :label="$t('wireguard.fields.port')"
          :description="$t('admin.config.port.description')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading :description="$t('admin.config.allowedIps.description')">
          {{ $t('wireguard.fields.allowedIps') }}
        </FormHeading>
        <FormArrayField
          v-model="data.defaultAllowedIps"
          name="defaultAllowedIps"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading :description="$t('admin.config.dns.description')">
          {{ $t('wireguard.fields.dns') }}
        </FormHeading>
        <FormArrayField v-model="data.defaultDns" name="defaultDns" />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('common.form.sections.advanced') }}</FormHeading>
        <FormSwitchField
          id="defaultGeneratePreSharedKey"
          v-model="data.defaultGeneratePreSharedKey"
          :label="$t('admin.config.generatePreSharedKey.label')"
          :description="$t('admin.config.generatePreSharedKey.description')"
        />
        <FormNullNumberField
          id="defaultMtu"
          v-model="data.defaultMtu"
          :label="$t('wireguard.fields.mtu')"
          :description="$t('admin.config.mtu.description')"
        />
        <FormNumberField
          id="defaultPersistentKeepalive"
          v-model="data.defaultPersistentKeepalive"
          :label="$t('wireguard.fields.persistentKeepalive')"
          :description="$t('admin.config.persistentKeepalive.description')"
        />
      </FormGroup>
      <FormGroup v-if="globalStore.information?.isAwg">
        <FormHeading>{{ $t('wireguard.obfuscation.title') }}</FormHeading>

        <FormNullNumberField
          id="jC"
          v-model="data.defaultJC"
          :label="$t('wireguard.obfuscation.jC.label')"
          :description="$t('wireguard.obfuscation.jC.description')"
        />
        <FormNullNumberField
          id="jMin"
          v-model="data.defaultJMin"
          :label="$t('wireguard.obfuscation.jMin.label')"
          :description="$t('wireguard.obfuscation.jMin.description')"
        />
        <FormNullNumberField
          id="jMax"
          v-model="data.defaultJMax"
          :label="$t('wireguard.obfuscation.jMax.label')"
          :description="$t('wireguard.obfuscation.jMax.description')"
        />

        <div class="col-span-full text-sm">
          * {{ $t('wireguard.obfuscation.mtuNote') }}
        </div>

        <FormNullTextField
          id="i1"
          v-model="data.defaultI1"
          :label="$t('wireguard.obfuscation.i1.label')"
          :description="$t('wireguard.obfuscation.i1.description')"
        />
        <FormNullTextField
          id="i2"
          v-model="data.defaultI2"
          :label="$t('wireguard.obfuscation.i2.label')"
          :description="$t('wireguard.obfuscation.i2.description')"
        />
        <FormNullTextField
          id="i3"
          v-model="data.defaultI3"
          :label="$t('wireguard.obfuscation.i3.label')"
          :description="$t('wireguard.obfuscation.i3.description')"
        />
        <FormNullTextField
          id="i4"
          v-model="data.defaultI4"
          :label="$t('wireguard.obfuscation.i4.label')"
          :description="$t('wireguard.obfuscation.i4.description')"
        />
        <FormNullTextField
          id="i5"
          v-model="data.defaultI5"
          :label="$t('wireguard.obfuscation.i5.label')"
          :description="$t('wireguard.obfuscation.i5.description')"
        />
      </FormGroup>
      <FormSaveControls @revert="revert" />
    </FormElement>
  </div>
</template>

<script lang="ts" setup>
import { $fetch } from '#imports';

const globalStore = useGlobalStore();

const { data: _data, refresh } = await useFetch(`/api/admin/userconfig`, {
  method: 'get',
});

const data = toRef(_data.value);

const _submit = useSubmit(
  (data) =>
    $fetch(`/api/admin/userconfig`, {
      method: 'post',
      body: data,
    }),
  { revert }
);

function submit() {
  return _submit(data.value);
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}
</script>
