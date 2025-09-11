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
        <FormNumberField id="jC" v-model="data.jC" label="Jc" />
        <FormNumberField id="jMin" v-model="data.jMin" label="Jmin" />
        <FormNumberField id="jMax" v-model="data.jMax" label="Jmax" />
        <FormNumberField id="s1" v-model="data.s1" label="S1" />
        <FormNumberField id="s2" v-model="data.s2" label="S2" />
        <FormNumberField id="h1" v-model="data.h1" label="H1" />
        <FormNumberField id="h2" v-model="data.h2" label="H2" />
        <FormNumberField id="h3" v-model="data.h3" label="H3" />
        <FormNumberField id="h4" v-model="data.h4" label="H4" />
        <FormNumberField id="i1" v-model="data.i1" label="I1" />
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
