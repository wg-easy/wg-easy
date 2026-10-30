<template>
  <div>
    <p class="text-sm leading-relaxed text-muted">
      {{ $t('setup.setupConfigDescription') }}
    </p>
    <div class="mt-8 flex flex-col gap-3">
      <div class="flex flex-col">
        <FormHostField
          id="host"
          v-model="host"
          :label="$t('wireguard.fields.host')"
          placeholder="vpn.example.com"
          :description="$t('setup.hostDescription')"
          url="/api/setup/4"
        />
      </div>
      <div class="flex flex-col">
        <FormNumberField
          id="port"
          v-model="port"
          :label="$t('wireguard.fields.port')"
          :description="$t('setup.portDescription')"
        />
      </div>
      <div class="mt-4 flex justify-center">
        <BasePrimaryButton @click="submit">
          {{ $t('common.actions.continue') }}
        </BasePrimaryButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { $fetch } from '#imports';

definePageMeta({
  layout: 'setup',
});

const setupStore = useSetupStore();
setupStore.setStep(4);

const host = ref<null | string>(null);
const port = ref<number>(51820);

const _submit = useSubmit(
  (data) =>
    $fetch('/api/setup/4', {
      method: 'post',
      body: data,
    }),
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
