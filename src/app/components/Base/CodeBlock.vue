<template>
  <div class="overflow-x-auto rounded border-2 border-red-800 py-2">
    <pre
      class="mx-2 inline-block"
      @click="selectCode"
    ><code ref="codeBlock">{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  code: string;
}>();

const codeBlock = useTemplateRef('codeBlock');

function selectCode() {
  // TODO: keyboard support?
  if (codeBlock.value) {
    const range = document.createRange();
    range.selectNodeContents(codeBlock.value);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}
</script>
