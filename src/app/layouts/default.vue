<template>
  <div>
    <header class="container mx-auto mt-4 max-w-3xl px-3 xs:mt-6 md:px-0">
      <div
        class="mb-5"
        :class="
          hasOwnLogo
            ? 'flex justify-end'
            : 'flex flex-auto flex-col-reverse items-center gap-3 xxs:flex-row'
        "
      >
        <HeaderLogo v-if="!hasOwnLogo" />
        <div class="flex grow-0 items-center gap-3 self-end xxs:self-center">
          <HeaderThemeSwitch />
          <HeaderChartToggle />
          <UiUserMenu v-if="loggedIn" />
        </div>
      </div>
      <HeaderUpdate class="mt-5" />
    </header>
    <slot />
    <footer>
      <p class="m-10 text-center text-xs text-gray-300 dark:text-neutral-600">
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
          href="https://emile.nl/?ref=wg-easy"
          >Emile Nijssen</a
        >
        is licensed under
        <a
          class="hover:underline"
          target="_blank"
          href="https://spdx.org/licenses/AGPL-3.0-only.html"
          >AGPL-3.0-only</a
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
  </div>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();

const route = useRoute();

const hasOwnLogo = computed(
  () => route.path === '/login' || route.path === '/setup'
);

const loggedIn = computed(
  () => route.path !== '/login' && route.path !== '/setup'
);
</script>
