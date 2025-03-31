<template>
  <footer>
    <p class="m-10 text-center text-xs text-gray-300 dark:text-neutral-600">
      <a
        class="hover:underline"
        target="_blank"
        href="https://github.com/wg-easy/wg-easy"
        >WireGuard Easy</a
      >
      ({{ globalStore.information?.currentRelease }}) © 2021-2025 by
      <a
        class="hover:underline"
        target="_blank"
        href="https://emile.nl/?ref=wg-easy"
        >Emile Nijssen</a
      >
      is licensed under
      <a
        class="hover:underline"
        target="_blank"
        href="https://opensource.org/license/agpl-v3"
        >AGPL-3.0-only</a
      >
      ·
      <a
        class="hover:underline"
        href="https://github.com/wg-easy/wg-easy#donate"
        target="_blank"
        >{{ $t('layout.donate') }}</a
      >
    </p>
  </footer>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();
</script>
