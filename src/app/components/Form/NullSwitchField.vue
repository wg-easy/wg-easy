<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <div class="my-auto flex items-center gap-3">
    <template v-if="data === null">
      <span class="text-gray-500 dark:text-neutral-300">
        {{ $t('form.nullNotSet') }}
      </span>
      <BaseSecondaryButton
        type="button"
        class="rounded-lg"
        @click="data = false"
      >
        {{ $t('form.set') }}
      </BaseSecondaryButton>
    </template>
    <template v-else>
      <BaseSwitch :id="id" v-model="enabled" />
      <BaseSecondaryButton
        type="button"
        class="rounded-lg"
        @click="data = null"
      >
        {{ $t('form.unset') }}
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
