<template>
  <footer
    class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-6 text-[11px] leading-relaxed text-subtle sm:px-7"
  >
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href="https://github.com/wg-easy/wg-easy"
        target="_blank"
        rel="noreferrer"
        class="font-semibold text-muted hover:text-foreground"
        >WireGuard Easy</a
      ><span
        v-if="globalStore.information?.currentRelease"
        class="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]"
        >{{ globalStore.information.currentRelease }}</span
      ><span
        >© 2021–2026
        <a
          href="https://emile.nl/?ref=wg-easy"
          target="_blank"
          rel="noreferrer"
          class="hover:text-foreground"
          >Emile Nijssen</a
        ></span
      >
    </div>
    <div class="flex flex-wrap gap-5">
      <a
        :href="documentationUrl"
        target="_blank"
        rel="noreferrer"
        class="hover:text-foreground"
        >{{ $t('ui.documentation') }} ↗</a
      ><a
        href="https://opensource.org/license/agpl-v3"
        target="_blank"
        rel="noreferrer"
        class="hover:text-foreground"
        >AGPL-3.0-only</a
      ><a
        href="https://github.com/wg-easy/wg-easy#donate"
        target="_blank"
        rel="noreferrer"
        class="hover:text-foreground"
        >{{ $t('layout.donate') }} ↗</a
      >
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { documentationUrl } from '~/utils/documentation';

const globalStore = useGlobalStore();
</script>
