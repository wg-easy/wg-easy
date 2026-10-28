<template>
  <div v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormNullNumberField
          id="mtu"
          v-model="data.mtu"
          :label="$t('wireguard.fields.mtu')"
          :description="$t('admin.interface.mtu.description')"
        />
        <FormNumberField
          id="port"
          v-model="data.port"
          :label="$t('wireguard.fields.port')"
          :description="$t('admin.interface.port.description')"
        />
        <FormTextField
          id="device"
          v-model="data.device"
          :label="$t('admin.interface.device.label')"
          :description="$t('admin.interface.device.description')"
        />
        <FormTextField
          id="routingTable"
          v-model="data.routingTable"
          :label="$t('admin.interface.routingTable.label')"
          :description="$t('admin.interface.routingTable.description')"
        />
      </FormGroup>
      <FormGroup v-if="globalStore.information?.isAwg">
        <FormHeading>{{ $t('wireguard.obfuscation.title') }}</FormHeading>

        <FormNullNumberField
          id="jC"
          v-model="data.jC"
          :label="$t('wireguard.obfuscation.jC.label')"
          :description="$t('wireguard.obfuscation.jC.description')"
        />
        <FormNullNumberField
          id="jMin"
          v-model="data.jMin"
          :label="$t('wireguard.obfuscation.jMin.label')"
          :description="$t('wireguard.obfuscation.jMin.description')"
        />
        <FormNullNumberField
          id="jMax"
          v-model="data.jMax"
          :label="$t('wireguard.obfuscation.jMax.label')"
          :description="$t('wireguard.obfuscation.jMax.description')"
        />
        <FormNullNumberField
          id="s1"
          v-model="data.s1"
          :label="$t('wireguard.obfuscation.s1.label')"
          :description="$t('wireguard.obfuscation.s1.description')"
        />
        <FormNullNumberField
          id="s2"
          v-model="data.s2"
          :label="$t('wireguard.obfuscation.s2.label')"
          :description="$t('wireguard.obfuscation.s2.description')"
        />

        <div class="col-span-full text-sm">
          * {{ $t('wireguard.obfuscation.mtuNote') }}
        </div>

        <FormNullNumberField
          id="s3"
          v-model="data.s3"
          :label="$t('wireguard.obfuscation.s3.label')"
          :description="$t('wireguard.obfuscation.s3.description')"
        />
        <FormNullNumberField
          id="s4"
          v-model="data.s4"
          :label="$t('wireguard.obfuscation.s4.label')"
          :description="$t('wireguard.obfuscation.s4.description')"
        />
        <FormNullTextField
          id="h1"
          v-model="data.h1"
          :label="$t('wireguard.obfuscation.h1.label')"
          :description="$t('wireguard.obfuscation.h1.description')"
        />
        <FormNullTextField
          id="h2"
          v-model="data.h2"
          :label="$t('wireguard.obfuscation.h2.label')"
          :description="$t('wireguard.obfuscation.h2.description')"
        />
        <FormNullTextField
          id="h3"
          v-model="data.h3"
          :label="$t('wireguard.obfuscation.h3.label')"
          :description="$t('wireguard.obfuscation.h3.description')"
        />
        <FormNullTextField
          id="h4"
          v-model="data.h4"
          :label="$t('wireguard.obfuscation.h4.label')"
          :description="$t('wireguard.obfuscation.h4.description')"
        />
        <FormNullTextField
          id="i1"
          v-model="data.i1"
          :label="$t('wireguard.obfuscation.i1.label')"
          :description="$t('wireguard.obfuscation.i1.description')"
        />
        <FormNullTextField
          id="i2"
          v-model="data.i2"
          :label="$t('wireguard.obfuscation.i2.label')"
          :description="$t('wireguard.obfuscation.i2.description')"
        />
        <FormNullTextField
          id="i3"
          v-model="data.i3"
          :label="$t('wireguard.obfuscation.i3.label')"
          :description="$t('wireguard.obfuscation.i3.description')"
        />
        <FormNullTextField
          id="i4"
          v-model="data.i4"
          :label="$t('wireguard.obfuscation.i4.label')"
          :description="$t('wireguard.obfuscation.i4.description')"
        />
        <FormNullTextField
          id="i5"
          v-model="data.i5"
          :label="$t('wireguard.obfuscation.i5.label')"
          :description="$t('wireguard.obfuscation.i5.description')"
        />
        <FormNullTextField
          id="headerProtectionKey"
          v-model="data.headerProtectionKey"
          :label="$t('wireguard.obfuscation.headerProtectionKey.label')"
          :description="
            $t('wireguard.obfuscation.headerProtectionKey.description')
          "
        />

        <div class="col-span-full text-sm">
          {{ $t('wireguard.obfuscation.rangeNote') }}
        </div>

        <FormNullTextField
          id="contentPaddingAddition"
          v-model="data.contentPaddingAddition"
          :label="$t('wireguard.obfuscation.contentPaddingAddition.label')"
          :description="
            $t('wireguard.obfuscation.contentPaddingAddition.description')
          "
        />
        <FormNullTextField
          id="rekeyAfterTime"
          v-model="data.rekeyAfterTime"
          :label="$t('wireguard.obfuscation.rekeyAfterTime.label')"
          :description="$t('wireguard.obfuscation.rekeyAfterTime.description')"
        />
        <FormNullTextField
          id="rekeyTimeout"
          v-model="data.rekeyTimeout"
          :label="$t('wireguard.obfuscation.rekeyTimeout.label')"
          :description="$t('wireguard.obfuscation.rekeyTimeout.description')"
        />
        <FormNullTextField
          id="rejectAfterTime"
          v-model="data.rejectAfterTime"
          :label="$t('wireguard.obfuscation.rejectAfterTime.label')"
          :description="$t('wireguard.obfuscation.rejectAfterTime.description')"
        />
        <FormNullTextField
          id="keepaliveTimeout"
          v-model="data.keepaliveTimeout"
          :label="$t('wireguard.obfuscation.keepaliveTimeout.label')"
          :description="
            $t('wireguard.obfuscation.keepaliveTimeout.description')
          "
        />
        <FormNullTextField
          id="maxHandshakeAttempts"
          v-model="data.maxHandshakeAttempts"
          :label="$t('wireguard.obfuscation.maxHandshakeAttempts.label')"
          :description="
            $t('wireguard.obfuscation.maxHandshakeAttempts.description')
          "
        />
        <FormNullSwitchField
          id="randomTrailers"
          v-model="data.randomTrailers"
          :label="$t('wireguard.obfuscation.randomTrailers.label')"
          :description="$t('wireguard.obfuscation.randomTrailers.description')"
        />
        <FormNullSwitchField
          id="disableCookies"
          v-model="data.disableCookies"
          :label="$t('wireguard.obfuscation.disableCookies.label')"
          :description="$t('wireguard.obfuscation.disableCookies.description')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('admin.interface.firewall') }}</FormHeading>
        <FormSwitchField
          id="firewallEnabled"
          v-model="data.firewallEnabled"
          :label="$t('admin.interface.firewallEnabled.label')"
          :description="$t('admin.interface.firewallEnabled.description')"
        />
      </FormGroup>
      <FormSaveControls @revert="revert" />
    </FormElement>
    <FormGroup class="mt-6">
      <FormHeading>{{ $t('common.form.actions') }}</FormHeading>
      <div class="col-span-full flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <AdminCidrDialog
          :ipv4-cidr="data.ipv4Cidr"
          :ipv6-cidr="data.ipv6Cidr"
          @change="changeCidr"
        >
          <BaseSecondaryButton as="span" class="w-full">
            {{ $t('admin.interface.changeCidr') }}
          </BaseSecondaryButton>
        </AdminCidrDialog>
        <AdminRestartInterfaceDialog @restart="restartInterface">
          <BaseSecondaryButton as="span" class="w-full">
            {{ $t('admin.interface.restart.label') }}
          </BaseSecondaryButton>
        </AdminRestartInterfaceDialog>
      </div>
    </FormGroup>
  </div>
</template>

<script setup lang="ts">
import { $fetch } from '#imports';

const globalStore = useGlobalStore();

const { t } = useI18n();

const { data: _data, refresh } = await useFetch(`/api/admin/interface`, {
  method: 'get',
});

const data = toRef(_data.value);

const _submit = useSubmit(
  (data) =>
    $fetch(`/api/admin/interface`, {
      method: 'post',
      body: data,
    }),
  {
    revert: async (success) => {
      await revert();
      if (success) {
        // Refresh global store information after successful save
        await globalStore.refreshInformation();
      }
    },
  }
);

function submit() {
  return _submit(data.value);
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}

const _changeCidr = useSubmit(
  (data) =>
    $fetch(`/api/admin/interface/cidr`, {
      method: 'post',
      body: data,
    }),
  {
    revert,
    successMsg: t('admin.interface.cidrSuccess'),
  }
);

async function changeCidr(ipv4Cidr: string, ipv6Cidr: string) {
  await _changeCidr({ ipv4Cidr, ipv6Cidr });
}

const _restartInterface = useSubmit(
  (data) =>
    $fetch(`/api/admin/interface/restart`, {
      method: 'post',
      body: data,
    }),
  {
    revert,
    successMsg: t('admin.interface.restartSuccess'),
  }
);

async function restartInterface() {
  await _restartInterface(undefined);
}
</script>
