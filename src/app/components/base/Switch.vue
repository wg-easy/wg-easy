<template>
  <SwitchRoot
    :id="id"
    v-model:checked="data"
    class="w-[40px] h-[24px] focus-within:outline focus-within:outline-red-700 flex bg-gray-200 dark:bg-neutral-400 shadow-sm rounded-full relative data-[state=checked]:bg-red-800 cursor-default"
  >
    <SwitchThumb
      class="block w-[16px] h-[16px] my-auto bg-white shadow-sm rounded-full transition-transform duration-100 translate-x-1 will-change-transform data-[state=checked]:translate-x-[20px]"
    />
  </SwitchRoot>
</template>

<script lang="ts" setup>
defineProps<{ id: string }>();
const data = defineModel<boolean>();
</script>
