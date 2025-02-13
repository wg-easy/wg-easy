<template>
  <h4 class="col-span-full flex items-center py-6 text-2xl">
    <slot />
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </h4>
</template>

<script lang="ts" setup>
defineProps<{ description?: string }>();
</script>
