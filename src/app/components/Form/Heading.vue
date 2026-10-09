<template>
  <h2
    class="col-span-full mb-1 flex items-center border-b border-line pb-4 text-base font-semibold tracking-tight text-foreground"
  >
    <slot /><BaseTooltip v-if="description" :text="description"
      ><IconsInfo class="size-4"
    /></BaseTooltip>
  </h2>
</template>

<script lang="ts" setup>
defineProps<{ description?: string }>();
</script>
