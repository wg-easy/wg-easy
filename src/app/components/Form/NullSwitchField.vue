<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <div class="my-auto flex items-center gap-3">
    <template v-if="data === null">
      <span class="text-subtle">
        {{ $t('common.form.nullNotSet') }}
      </span>
      <BaseSecondaryButton type="button" @click="data = false">
        {{ $t('common.form.set') }}
      </BaseSecondaryButton>
    </template>
    <template v-else>
      <BaseSwitch :id="id" v-model="enabled" />
      <BaseSecondaryButton type="button" @click="data = null">
        {{ $t('common.form.unset') }}
      </BaseSecondaryButton>
    </template>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();

const data = defineModel<boolean | null>();

/** `null` is rendered as its own state, so the switch is only ever a boolean */
const enabled = computed({
  get: () => data.value === true,
  set: (value: boolean) => {
    data.value = value;
  },
});
</script>
