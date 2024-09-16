<script setup lang="ts">
const props = defineProps<{
  title: string;
  message: string;
  duration?: number;
}>();

const open = ref(true);

const autoCloseToast = props.duration ? Number(props.duration) : 12000; // 12 seconds

onMounted(() => {
  setTimeout(() => {
    open.value = false;
  }, autoCloseToast);
});
</script>

<template>
  <ToastRoot
    v-model:open="open"
    class="bg-red-800 rounded-md p-2 text-neutral-200"
  >
    <ToastTitle class="mb-4 font-medium text-lg">{{ title }} </ToastTitle>
    <ToastDescription as-child>{{ message }}</ToastDescription>
  </ToastRoot>
</template>
