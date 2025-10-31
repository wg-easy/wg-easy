<template>
  <main v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormNumberField
          id="mtu"
          v-model="data.mtu"
          :label="$t('general.mtu')"
          :description="$t('admin.interface.mtuDesc')"
        />
        <FormNumberField
          id="port"
          v-model="data.port"
          :label="$t('general.port')"
          :description="$t('admin.interface.portDesc')"
        />
        <FormTextField
          id="device"
          v-model="data.device"
          :label="$t('admin.interface.device')"
          :description="$t('admin.interface.deviceDesc')"
        />
      </FormGroup>
      <FormGroup v-if="globalStore.information?.isAwg">
        <FormHeading>{{ $t('awg.obfuscationParameters') }}</FormHeading>

        <FormNullNumberField
          id="jC"
          v-model="data.jC"
          :label="$t('awg.jCLabel')"
          :description="$t('awg.jCDescription')"
        />
        <FormNullNumberField
          id="jMin"
          v-model="data.jMin"
          :label="$t('awg.jMinLabel')"
          :description="$t('awg.jMinDescription')"
        />
        <FormNullNumberField
          id="jMax"
          v-model="data.jMax"
          :label="$t('awg.jMaxLabel')"
          :description="$t('awg.jMaxDescription')"
        />
        <FormNullNumberField
          id="s1"
          v-model="data.s1"
          :label="$t('awg.s1Label')"
          :description="$t('awg.s1Description')"
        />
        <FormNullNumberField
          id="s2"
          v-model="data.s2"
          :label="$t('awg.s2Label')"
          :description="$t('awg.s2Description')"
        />

        <div class="col-span-full text-sm">* {{ $t('awg.mtuNote') }}</div>

        <FormNullNumberField
          id="s3"
          v-model="data.s3"
          :label="$t('awg.s3Label')"
          :description="$t('awg.s3Description')"
        />
        <FormNullNumberField
          id="s4"
          v-model="data.s4"
          :label="$t('awg.s4Label')"
          :description="$t('awg.s4Description')"
        />
        <FormNullTextField
          id="i1"
          v-model="data.i1"
          :label="$t('awg.i1Label')"
          :description="$t('awg.i1Description')"
        />
        <FormNullTextField
          id="i2"
          v-model="data.i2"
          :label="$t('awg.i2Label')"
          :description="$t('awg.i2Description')"
        />
        <FormNullTextField
          id="i3"
          v-model="data.i3"
          :label="$t('awg.i3Label')"
          :description="$t('awg.i3Description')"
        />
        <FormNullTextField
          id="i4"
          v-model="data.i4"
          :label="$t('awg.i4Label')"
          :description="$t('awg.i4Description')"
        />
        <FormNullTextField
          id="i5"
          v-model="data.i5"
          :label="$t('awg.i5Label')"
          :description="$t('awg.i5Description')"
        />
        <FormNullNumberField
          id="h1"
          v-model="data.h1"
          :label="$t('awg.h1Label')"
          :description="$t('awg.h1Description')"
        />
        <FormNullNumberField
          id="h2"
          v-model="data.h2"
          :label="$t('awg.h2Label')"
          :description="$t('awg.h2Description')"
        />
        <FormNullNumberField
          id="h3"
          v-model="data.h3"
          :label="$t('awg.h3Label')"
          :description="$t('awg.h3Description')"
        />
        <FormNullNumberField
          id="h4"
          v-model="data.h4"
          :label="$t('awg.h4Label')"
          :description="$t('awg.h4Description')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('form.actions') }}</FormHeading>
        <FormPrimaryActionField type="submit" :label="$t('form.save')" />
        <FormSecondaryActionField :label="$t('form.revert')" @click="revert" />
        <AdminCidrDialog
          trigger-class="col-span-2"
          :ipv4-cidr="data.ipv4Cidr"
          :ipv6-cidr="data.ipv6Cidr"
          @change="changeCidr"
        >
          <FormSecondaryActionField
            :label="$t('admin.interface.changeCidr')"
            class="w-full"
            tabindex="-1"
          />
        </AdminCidrDialog>
        <AdminRestartInterfaceDialog
          trigger-class="col-span-2"
          @restart="restartInterface"
        >
          <FormSecondaryActionField
            :label="$t('admin.interface.restart')"
            class="w-full"
            tabindex="-1"
          />
        </AdminRestartInterfaceDialog>
      </FormGroup>
    </FormElement>
  </main>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();

const { t } = useI18n();

const { data: _data, refresh } = await useFetch(`/api/admin/interface`, {
  method: 'get',
});

const data = toRef(_data.value);

const _submit = useSubmit(
  `/api/admin/interface`,
  {
    method: 'post',
  },
  { revert }
);

function submit() {
  return _submit(data.value);
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}

const _changeCidr = useSubmit(
  `/api/admin/interface/cidr`,
  {
    method: 'post',
  },
  {
    revert,
    successMsg: t('admin.interface.cidrSuccess'),
  }
);

async function changeCidr(ipv4Cidr: string, ipv6Cidr: string) {
  await _changeCidr({ ipv4Cidr, ipv6Cidr });
}

const _restartInterface = useSubmit(
  `/api/admin/interface/restart`,
  {
    method: 'post',
  },
  {
    revert,
    successMsg: t('admin.interface.restartSuccess'),
  }
);

async function restartInterface() {
  await _restartInterface(undefined);
}
</script>
