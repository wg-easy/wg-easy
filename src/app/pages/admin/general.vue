<template>
  <main v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormNumberField
          id="session"
          v-model="data.sessionTimeout"
          :label="$t('admin.general.sessionTimeout')"
          :description="$t('admin.general.sessionTimeoutDesc')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('admin.general.metrics') }}</FormHeading>
        <FormNullTextField
          id="password"
          v-model="data.metricsPassword"
          :label="$t('admin.general.metricsPassword')"
          :description="$t('admin.general.metricsPasswordDesc')"
        />
        <FormSwitchField
          id="prometheus"
          v-model="data.metricsPrometheus"
          :label="$t('admin.general.prometheus')"
          :description="$t('admin.general.prometheusDesc')"
        />
        <FormSwitchField
          id="json"
          v-model="data.metricsJson"
          :label="$t('admin.general.json')"
          :description="$t('admin.general.jsonDesc')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('admin.general.bandwidth') }}</FormHeading>
        <FormSwitchField
          id="bandwidthEnabled"
          v-model="data.bandwidthEnabled"
          :label="$t('admin.general.bandwidthEnabled')"
          :description="$t('admin.general.bandwidthEnabledDesc')"
        />
        <FormNumberField
          v-if="data.bandwidthEnabled"
          id="downloadLimit"
          v-model="data.downloadLimitMbps"
          :label="$t('admin.general.downloadLimit')"
          :description="$t('admin.general.downloadLimitDesc')"
        />
        <FormNumberField
          v-if="data.bandwidthEnabled"
          id="uploadLimit"
          v-model="data.uploadLimitMbps"
          :label="$t('admin.general.uploadLimit')"
          :description="$t('admin.general.uploadLimitDesc')"
        />
        <div
          v-if="
            data.bandwidthEnabled &&
            data.uploadLimitMbps > 0 &&
            bandwidthStatus &&
            !bandwidthStatus.ifbAvailable
          "
          class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20"
        >
          <p class="text-sm text-yellow-700 dark:text-yellow-400">
            {{ $t('admin.general.ifbWarning') }}
          </p>
        </div>
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('form.actions') }}</FormHeading>
        <FormPrimaryActionField type="submit" :label="$t('form.save')" />
        <FormSecondaryActionField :label="$t('form.revert')" @click="revert" />
      </FormGroup>
    </FormElement>
  </main>
</template>

<script setup lang="ts">
const { data: _data, refresh } = await useFetch(`/api/admin/general`, {
  method: 'get',
});
const data = toRef(_data.value);

const { data: bandwidthStatus } = await useFetch(`/api/admin/bandwidth-status`, {
  method: 'get',
});

const _submit = useSubmit(
  `/api/admin/general`,
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
</script>
