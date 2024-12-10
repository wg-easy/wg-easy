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

const count = reactive<{ title: string; message: string }[]>([]);

function publish(e: { title: string; message: string }) {
  count.push({ title: e.title, message: e.message });
  console.log(count.length);
}
</script>

<template>
  <ToastRoot
    v-for="(e, i) in count"
    :key="i"
    class="data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=end]:animate-swipeOut grid grid-cols-[auto_max-content] items-center gap-x-[15px] rounded-md bg-red-800 p-[15px] text-neutral-200 shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] [grid-template-areas:_'title_action'_'description_action'] data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:transition-[transform_200ms_ease-out]"
  >
    <ToastTitle
      class="text-slate12 mb-[5px] text-[15px] font-medium [grid-area:_title]"
    >
      {{ e.title }}
    </ToastTitle>
    <ToastDescription
      class="text-slate11 m-0 text-[13px] leading-[1.3] [grid-area:_description]"
      >{{ e.message }}</ToastDescription
    >
    <ToastAction as-child alt-text="toast" class="[grid-area:_action]">
      <slot />
    </ToastAction>
    <ToastClose aria-label="Close">
      <span aria-hidden>×</span>
    </ToastClose>
  </ToastRoot>
</template>
