<template>
  <AvatarRoot
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[inherit] align-middle select-none"
  >
    <AvatarImage
      class="h-full w-full rounded-[inherit] object-cover"
      :src="img ?? ''"
    />
    <AvatarFallback
      class="flex h-full w-full items-center justify-center text-xs font-semibold"
      :delay-ms="600"
    >
      <slot />
    </AvatarFallback>
  </AvatarRoot>
</template>

<script lang="ts" setup>
defineProps<{ img?: string }>();
</script>
