<template>
  <DialogRoot :modal="true" @update:open="updateOpen">
    <DialogTrigger :class="triggerClass"><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
      <DialogContent
        class="surface fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 shadow-2xl focus:outline-none sm:p-7"
      >
        <DialogTitle
          class="pr-8 text-xl font-semibold tracking-tight text-foreground"
          ><slot name="title"
        /></DialogTitle>
        <DialogClose
          class="icon-button absolute top-5 right-5"
          :aria-label="$t('dialog.cancel')"
          ><IconsClose class="size-4"
        /></DialogClose>
        <DialogDescription
          as="div"
          class="mt-5 text-sm leading-relaxed text-muted"
          ><slot name="description"
        /></DialogDescription>
        <div
          class="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-5"
        >
          <slot name="actions" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script lang="ts" setup>
defineProps<{ triggerClass?: string }>();

const emit = defineEmits<{
  'update:open': [open: boolean];
}>();

function updateOpen(open: boolean) {
  emit('update:open', open);
}
</script>
