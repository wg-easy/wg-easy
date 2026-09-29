<template>
  <main v-if="data">
    <FormProtocolField v-model="protocol" />
    <FormElement v-if="!pending" @submit.prevent="submit">
      <FormGroup>
        <FormTextArea
          id="PreUp"
          v-model="data.preUp"
          :label="$t('hooks.preUp')"
        />
        <FormTextArea
          id="PostUp"
          v-model="data.postUp"
          :label="$t('hooks.postUp')"
        />
        <FormTextArea
          id="PreDown"
          v-model="data.preDown"
          :label="$t('hooks.preDown')"
        />
        <FormTextArea
          id="PostDown"
          v-model="data.postDown"
          :label="$t('hooks.postDown')"
        />
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
const protocol = ref<'awg' | 'wg'>('awg');
const {
  data: _data,
  refresh,
  pending,
} = await useFetch(`/api/admin/hooks`, {
  method: 'get',
  query: { protocol },
  watch: false,
});

const data = toRef(_data.value);
watch(protocol, () => revert());

const _submit = useSubmit(
  (data) =>
    $fetch(`/api/admin/hooks`, {
      method: 'post',
      query: { protocol: protocol.value },
      body: data,
    }),
  { revert }
);

async function submit() {
  return _submit(data.value);
}

async function revert() {
  await refresh();
  data.value = toRef(_data.value).value;
}
</script>
