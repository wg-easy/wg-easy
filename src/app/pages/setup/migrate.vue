<template>
  <div class="flex flex-col items-center">
    <p class="text-sm leading-relaxed text-muted">
      {{ $t('setup.setupMigrationDescription') }}
    </p>
    <div class="mt-8 flex w-full flex-col gap-3">
      <Label for="migration">{{ $t('setup.migration') }}</Label>
      <input
        id="migration"
        ref="migration"
        class="ui-input file:mr-3 file:rounded file:border-0 file:bg-surface-raised file:px-3 file:py-1 file:text-muted"
        type="file"
      />
    </div>
    <div class="mt-4">
      <BasePrimaryButton @click="submit">
        {{ $t('setup.upload') }}
      </BasePrimaryButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { $fetch } from '#imports';

definePageMeta({
  layout: 'setup',
});

useSetupStore().step = 4;

const migration = useTemplateRef<HTMLInputElement>('migration');

const upload = useSubmit(
  async (file: File) =>
    $fetch('/api/setup/migrate', {
      method: 'post',
      body: { file: await file.text() },
    }),
  {
    revert: async (success) => {
      if (success) {
        await navigateTo('/');
      }
    },
    noSuccessToast: true,
  }
);

async function submit() {
  const file = migration.value?.files?.[0];
  if (file) {
    await upload(file);
  }
}
</script>
