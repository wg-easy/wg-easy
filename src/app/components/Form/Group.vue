<template>
  <section class="grid grid-cols-2 gap-4">
    <slot />
    <Separator
      decorative
      class="col-span-2 h-px w-full bg-gray-100 dark:bg-neutral-600"
    />
  </section>
</template>
