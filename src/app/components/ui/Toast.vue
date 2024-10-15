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
    class="bg-white rounded-md shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] p-[15px] grid [grid-template-areas:_'title_action'_'description_action'] grid-cols-[auto_max-content] gap-x-[15px] items-center data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipeOut"
  >
    <ToastTitle
      v-if="title"
      class="[grid-area:_title] mb-[5px] font-medium text-slate12 text-[15px]"
    >
      {{ title }}
    </ToastTitle>
    <ToastDescription
      class="[grid-area:_description] m-0 text-slate11 text-[13px] leading-[1.3]"
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
