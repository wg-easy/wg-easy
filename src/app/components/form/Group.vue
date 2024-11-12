<template>
  <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <slot />
    <Separator
      decorative
      class="w-full h-px bg-gray-100 dark:bg-neutral-600 col-span-2"
    />
  </section>
</template>
