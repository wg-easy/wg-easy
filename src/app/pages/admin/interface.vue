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
      <FormGroup v-if="!data.isUsingAwg">
        <FormHeading>AmneziaWG</FormHeading>
        <p class="text-sm text-muted-foreground col-span-2">
          AmneziaWG obfuscation is not currently active. To enable it, set
          <code class="bg-muted px-1 py-0.5 rounded">EXPERIMENTAL_AWG=true</code>
          and ensure the amneziawg kernel module is available.
        </p>
      </FormGroup>
      <FormGroup v-if="data.isUsingAwg">
        <FormHeading>AmneziaWG Obfuscation Parameters</FormHeading>
        <FormNumberField
          id="jc"
          v-model="data.jc"
          label="Junk packet count (Jc)"
          description="Number of junk packets to send (1-128, recommended: 4-12)"
        />
        <FormNumberField
          id="jmin"
          v-model="data.jmin"
          label="Junk packet min size (Jmin)"
          description="Min junk packet size in bytes (0-1279, recommended: 8, must be < Jmax)"
        />
        <FormNumberField
          id="jmax"
          v-model="data.jmax"
          label="Junk packet max size (Jmax)"
          description="Max junk packet size in bytes (1-1280, recommended: 80, must be > Jmin)"
        />
        <FormNumberField
          id="s1"
          v-model="data.s1"
          label="Init header junk size (S1)"
          description="Init packet junk size in bytes (0-1132, recommended: 15-150, S1+56 ≠ S2)"
        />
        <FormNumberField
          id="s2"
          v-model="data.s2"
          label="Response header junk size (S2)"
          description="Response packet junk size in bytes (0-1188, recommended: 15-150)"
        />
        <FormNumberField
          id="h1"
          v-model="data.h1"
          label="Init magic header (H1)"
          description="Init packet header value (>4, must be unique from H2-H4)"
        />
        <FormNumberField
          id="h2"
          v-model="data.h2"
          label="Response magic header (H2)"
          description="Response packet header value (>4, must be unique from H1,H3,H4)"
        />
        <FormNumberField
          id="h3"
          v-model="data.h3"
          label="Cookie magic header (H3)"
          description="Cookie packet header value (>4, must be unique from H1,H2,H4)"
        />
        <FormNumberField
          id="h4"
          v-model="data.h4"
          label="Transport magic header (H4)"
          description="Transport packet header value (>4, must be unique from H1-H3)"
        />
        <FormNumberField
          id="s3"
          v-model="data.s3"
          label="Cookie header junk size (S3)"
          description="Cookie packet junk size in bytes (0-1132)"
        />
        <FormNumberField
          id="s4"
          v-model="data.s4"
          label="Transport header junk size (S4)"
          description="Transport packet junk size in bytes (0-1188)"
        />
        <FormTextField
          id="i1"
          v-model="data.i1"
          label="Special junk packet 1 (I1)"
          description="Protocol mimic packet in hex format: <b 0x...> (QUIC default)"
        />
        <FormTextField
          id="i2"
          v-model="data.i2"
          label="Special junk packet 2 (I2)"
          description="Additional special packet (optional)"
        />
        <FormTextField
          id="i3"
          v-model="data.i3"
          label="Special junk packet 3 (I3)"
          description="Additional special packet (optional)"
        />
        <FormTextField
          id="i4"
          v-model="data.i4"
          label="Special junk packet 4 (I4)"
          description="Additional special packet (optional)"
        />
        <FormTextField
          id="i5"
          v-model="data.i5"
          label="Special junk packet 5 (I5)"
          description="Additional special packet (optional)"
        />
        <FormTextField
          id="j1"
          v-model="data.j1"
          label="Junk packet schedule 1 (J1)"
          description="Scheduling parameter (optional)"
        />
        <FormTextField
          id="j2"
          v-model="data.j2"
          label="Junk packet schedule 2 (J2)"
          description="Scheduling parameter (optional)"
        />
        <FormTextField
          id="j3"
          v-model="data.j3"
          label="Junk packet schedule 3 (J3)"
          description="Scheduling parameter (optional)"
        />
        <FormNumberField
          id="itime"
          v-model="data.itime"
          label="Interval time (Itime)"
          description="Interval time parameter in seconds (0-2147483647, Windows: must be 0)"
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
