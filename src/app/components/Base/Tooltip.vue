<template>
  <TooltipProvider>
    <TooltipRoot :open="open" @update:open="open = $event">
      <TooltipTrigger
        class="mx-2 inline-flex h-4 w-4 items-center justify-center rounded-full text-subtle"
        as-child
      >
        <button type="button" :aria-label="text" @click="open = !open">
          <slot />
        </button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="ui-menu z-[100] max-w-xs px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
          :side-offset="5"
        >
          {{ text }}
          <TooltipArrow class="fill-surface" :width="8" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<script lang="ts" setup>
defineProps<{ text: string }>();

const open = ref(false);
</script>
