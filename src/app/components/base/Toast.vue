<template>
  <ToastRoot
    v-for="(e, i) in count"
    :key="i"
    :class="[
      `grid grid-cols-[auto_max-content] items-center gap-x-3 rounded-md p-3 text-neutral-200 shadow-lg [grid-template-areas:_'title_action'_'description_action'] data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]`,
      {
        'bg-green-800': e.type === 'success',
        'bg-red-800': e.type === 'error',
      },
    ]"
  >
    <ToastTitle class="mb-1 text-sm font-medium [grid-area:_title]">
      {{ e.title }}
    </ToastTitle>
    <ToastDescription class="m-0 text-sm [grid-area:_description]">{{
      e.message
    }}</ToastDescription>
    <ToastAction as-child alt-text="toast" class="[grid-area:_action]">
      <slot />
    </ToastAction>
    <ToastClose aria-label="Close">
      <span aria-hidden>×</span>
    </ToastClose>
  </ToastRoot>
</template>

<script setup lang="ts">
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRoot,
  ToastTitle,
} from 'radix-vue';

defineExpose({
  publish,
});

const count = reactive<ToastParams[]>([]);

function publish(e: ToastParams) {
  count.push({ type: e.type, title: e.title, message: e.message });
}
</script>
