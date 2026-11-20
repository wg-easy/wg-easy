<template>
  <span
    class="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent"
  >
    <span class="truncate"><slot /></span>
    <slot name="action" />
  </span>
</template>
