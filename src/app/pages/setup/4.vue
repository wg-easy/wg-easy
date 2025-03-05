<template>
  <div>
    <p class="p-8 text-center text-lg">
      {{ $t('setup.setupConfigDesc') }}
    </p>
    <div class="flex flex-col gap-3">
      <div class="flex flex-col">
        <FormNullTextField
          id="host"
          v-model="host"
          :label="$t('general.host')"
          placeholder="vpn.example.com"
        />
      </div>
      <div class="flex flex-col">
        <FormNumberField id="port" v-model="port" :label="$t('general.port')" />
      </div>
      <div>
        <BaseButton @click="submit">{{ $t('general.continue') }}</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(4);

const host = ref<null | string>(null);
const port = ref<number>(51820);

const _submit = useSubmit(
  '/api/setup/4',
  {
    method: 'post',
  },
  {
    revert: async (success) => {
      if (success) {
        await navigateTo('/setup/success');
      }
    },
    noSuccessToast: true,
  }
);

function submit() {
  return _submit({ host: host.value, port: port.value });
}
</script>
