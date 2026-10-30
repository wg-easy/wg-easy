<template>
  <div v-if="data">
    <FormElement @submit.prevent="submit">
      <FormGroup>
        <FormNumberField
          id="session"
          v-model="data.sessionTimeout"
          :label="$t('admin.general.sessionTimeout.label')"
          :description="$t('admin.general.sessionTimeout.description')"
        />
      </FormGroup>
      <FormGroup>
        <FormHeading>{{ $t('admin.general.metrics') }}</FormHeading>
        <FormNullTextField
          id="password"
          v-model="data.metricsPassword"
          :label="$t('admin.general.metricsPassword.label')"
          :description="$t('admin.general.metricsPassword.description')"
        />
        <FormSwitchField
          id="prometheus"
          v-model="data.metricsPrometheus"
          :label="$t('admin.general.prometheus.label')"
          :description="$t('admin.general.prometheus.description')"
        />
        <FormSwitchField
          id="json"
          v-model="data.metricsJson"
          :label="$t('admin.general.json.label')"
          :description="$t('admin.general.json.description')"
        />
      </FormGroup>
      <FormSaveControls @revert="revert" />
    </FormElement>
  </div>
</template>

<script setup lang="ts">
import { $fetch } from '#imports';

const { data: _data, refresh } = await useFetch(`/api/admin/general`, {
  method: 'get',
});
const data = toRef(_data.value);

const _submit = useSubmit(
  (data) =>
    $fetch(`/api/admin/general`, {
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
