<template>
  <div>
    <header class="container mx-auto mt-4 max-w-3xl px-3 xs:mt-6 md:px-0">
      <div
        :class="
          hasOwnLogo
            ? 'flex justify-end'
            : 'flex flex-auto flex-col-reverse items-center gap-3 xxs:flex-row'
        "
      >
        <NuxtLink to="/" class="mb-4 flex-grow self-start">
          <h1
            v-if="!hasOwnLogo"
            class="text-4xl font-medium dark:text-neutral-200"
          >
            <img
              src="/logo.png"
              width="32"
              class="dark:bg mr-2 inline align-middle"
            /><span class="align-middle">WireGuard</span>
          </h1>
        </NuxtLink>
        <div class="flex grow-0 items-center gap-3 self-end xxs:self-center">
          <!-- Dark / light theme -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 transition hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            :title="$t(`theme.${theme.preference}`)"
            @click="toggleTheme"
          >
            <IconsSun v-if="theme.preference === 'light'" class="h-5 w-5" />
            <IconsMoon
              v-else-if="theme.preference === 'dark'"
              class="h-5 w-5 text-neutral-400"
            />
            <IconsHalfMoon
              v-else
              class="h-5 w-5 fill-gray-600 dark:fill-neutral-400"
            />
          </button>
          <!-- Show / hide charts -->
          <label
            v-if="globalStore.statistics.chartType > 0"
            class="group inline-flex h-8 w-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-gray-200 transition hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            :title="$t('toggleCharts')"
          >
            <input
              v-model="uiShowCharts"
              type="checkbox"
              value=""
              class="peer sr-only"
              @change="toggleCharts"
            />
            <IconsChart
              class="peer h-5 w-5 fill-gray-400 transition peer-checked:fill-gray-600 dark:fill-neutral-600 group-hover:dark:fill-neutral-500 peer-checked:dark:fill-neutral-400"
            />
          </label>
          <UiUserMenu v-if="loggedIn" />
        </div>
      </div>
      <div class="mb-5 text-sm text-gray-400 dark:text-neutral-400" />
      <div
        v-if="globalStore.updateAvailable && globalStore.latestRelease"
        class="font-small mb-10 rounded-md bg-red-800 p-4 text-sm text-white shadow-lg dark:bg-red-100 dark:text-red-600"
        :title="`v${globalStore.currentRelease} → v${globalStore.latestRelease.version}`"
      >
        <div class="container mx-auto flex flex-auto flex-row items-center">
          <div class="flex-grow">
            <p class="font-bold">{{ $t('updateAvailable') }}</p>
            <p>{{ globalStore.latestRelease.changelog }}</p>
          </div>

          <a
            :href="`https://github.com/wg-easy/wg-easy/releases/tag/${globalStore.latestRelease.version}`"
            target="_blank"
            class="font-sm float-right flex-shrink-0 rounded-md border-2 border-red-800 bg-white p-3 font-semibold text-red-800 transition-all hover:border-white hover:bg-red-800 hover:text-white dark:border-red-600 dark:bg-red-100 dark:text-red-600 dark:hover:border-red-600 dark:hover:bg-red-600 dark:hover:text-red-100"
          >
            {{ $t('update') }} →
          </a>
        </div>
      </div>
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
          href="https://spdx.org/licenses/AGPL-3.0-or-later.html"
          >AGPL-3.0-or-later</a
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

const theme = useTheme();
const uiShowCharts = ref(getItem('uiShowCharts') === '1');

function toggleTheme() {
  const themeCycle = {
    system: 'light',
    light: 'dark',
    dark: 'system',
  } as const;

  theme.preference = themeCycle[theme.preference];
}

function toggleCharts() {
  setItem('uiShowCharts', uiShowCharts.value ? '1' : '0');
}
</script>
