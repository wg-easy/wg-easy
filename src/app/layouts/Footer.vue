<template>
  <footer>
    <p class="text-center m-10 text-gray-300 dark:text-neutral-600 text-xs">
      <a
        class="hover:underline"
        target="_blank"
        href="https://github.com/wg-easy/wg-easy"
        >WireGuard Easy</a
      >
      ({{ globalStore.currentRelease }}) © 2021-2024 by
      <a
        class="hover:underline"
        target="_blank"
        href="https://emilenijssen.nl/?ref=wg-easy"
        >Emile Nijssen</a
      >
      is licensed under
      <a
        class="hover:underline"
        target="_blank"
        href="http://creativecommons.org/licenses/by-nc-sa/4.0/"
        >CC BY-NC-SA 4.0</a
      >
      ·
      <a
        class="hover:underline"
        href="https://github.com/sponsors/WeeJeWel"
        target="_blank"
        >{{ $t('donate') }}</a
      >
    </p>
  </footer>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
</script>
