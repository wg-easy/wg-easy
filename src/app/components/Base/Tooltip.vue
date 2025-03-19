<template>
  <TooltipProvider>
    <TooltipRoot :open="open" @update:open="open = $event">
      <TooltipTrigger
        class="mx-2 inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 outline-none focus:shadow-sm focus:shadow-black"
        as-child
      >
        <button type="button" @click="open = !open">
          <slot />
        </button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="select-none whitespace-pre-line rounded bg-gray-600 px-3 py-2 text-sm leading-none text-white shadow-lg will-change-[transform,opacity]"
          :side-offset="5"
        >
          {{ text }}
          <TooltipArrow class="fill-gray-600" :width="8" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<script lang="ts" setup>
defineProps<{ text: string }>();

const open = ref(false);
</script>
