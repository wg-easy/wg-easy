<script setup lang="ts">
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRoot,
  ToastTitle,
} from 'radix-vue';

defineProps<{
  title: string;
  content: string;
}>();
</script>

<template>
  <ToastRoot
    class="data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=end]:animate-swipeOut grid grid-cols-[auto_max-content] items-center gap-x-[15px] rounded-md bg-white p-[15px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] [grid-template-areas:_'title_action'_'description_action'] data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:transition-[transform_200ms_ease-out]"
  >
    <ToastTitle
      v-if="title"
      class="text-slate12 mb-[5px] text-[15px] font-medium [grid-area:_title]"
    >
      {{ title }}
    </ToastTitle>
    <ToastDescription
      class="text-slate11 m-0 text-[13px] leading-[1.3] [grid-area:_description]"
      >{{ content }}</ToastDescription
    >
    <ToastAction as-child alt-text="toast" class="[grid-area:_action]">
      <slot />
    </ToastAction>
    <ToastClose aria-label="Close">
      <span aria-hidden>×</span>
    </ToastClose>
  </ToastRoot>
</template>
