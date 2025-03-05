<template>
  <SwitchRoot
    :id="id"
    v-model:checked="data"
    :name="id"
    class="relative flex h-6 w-10 cursor-default rounded-full bg-gray-200 shadow-sm focus-within:outline focus-within:outline-red-700 data-[state=checked]:bg-red-800 dark:bg-neutral-400"
  >
    <SwitchThumb
      class="my-auto block h-4 w-4 translate-x-1 rounded-full bg-white shadow-sm transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[20px]"
    />
  </SwitchRoot>
</template>

<script lang="ts" setup>
defineProps<{ id?: string }>();
const data = defineModel<boolean>();
</script>
