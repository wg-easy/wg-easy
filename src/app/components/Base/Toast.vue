<template>
  <ToastRoot
    v-for="(e, i) in count"
    :key="i"
    class="surface grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4 shadow-xl data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--reka-toast-swipe-move-x)]"
  >
    <IconsCheckCircle
      v-if="e.type === 'success'"
      class="mt-0.5 size-5 text-success"
    /><IconsWarning v-else class="mt-0.5 size-5 text-accent" />
    <div>
      <ToastTitle class="text-sm font-semibold text-foreground">{{
        e.title
      }}</ToastTitle
      ><ToastDescription class="mt-1 text-xs leading-relaxed text-muted">{{
        e.message
      }}</ToastDescription>
    </div>
    <ToastClose
      :aria-label="$t('dialog.cancel')"
      class="grid size-6 place-items-center rounded text-subtle hover:bg-surface-raised"
      ><IconsClose class="size-3"
    /></ToastClose>
  </ToastRoot>
</template>

<script setup lang="ts">
defineExpose({
  publish,
});

const count = reactive<ToastParams[]>([]);

function publish(e: ToastParams) {
  count.push({ type: e.type, title: e.title, message: e.message });
}
</script>
