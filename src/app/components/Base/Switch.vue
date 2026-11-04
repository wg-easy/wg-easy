<template>
  <SwitchRoot
    :id="id"
    v-model="data"
    :name="id"
    class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-line bg-surface-hover transition-colors disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
  >
    <SwitchThumb
      class="block size-3.5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4.5"
    />
  </SwitchRoot>
</template>

<script lang="ts" setup>
defineProps<{ id?: string }>();
const data = defineModel<boolean>();
</script>
