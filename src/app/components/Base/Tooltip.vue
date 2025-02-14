<template>
  <TooltipProvider>
    <TooltipRoot>
      <TooltipTrigger
        class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 outline-none focus:shadow-sm focus:shadow-black"
      >
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="select-none rounded bg-gray-600 px-3 py-2 text-sm leading-none text-white shadow-lg will-change-[transform,opacity]"
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
</script>
