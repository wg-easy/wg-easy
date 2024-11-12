<template>
  <div>
    <header class="container mx-auto max-w-3xl px-3 md:px-0 mt-4 xs:mt-6">
      <div
        :class="
          hasOwnLogo
            ? 'flex justify-end'
            : 'flex flex-col-reverse xxs:flex-row flex-auto items-center gap-3'
        "
      >
        <NuxtLink to="/" class="flex-grow self-start mb-4">
          <h1
            v-if="!hasOwnLogo"
            class="text-4xl dark:text-neutral-200 font-medium"
          >
            <img
              src="/logo.png"
              width="32"
              class="inline align-middle dark:bg mr-2"
            /><span class="align-middle">WireGuard</span>
          </h1>
        </NuxtLink>
        <div class="flex items-center grow-0 gap-3 self-end xxs:self-center">
          <!-- Dark / light theme -->
          <button
            class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition"
            :title="$t(`theme.${theme.preference}`)"
            @click="toggleTheme"
          >
            <IconsSun v-if="theme.preference === 'light'" class="w-5 h-5" />
            <IconsMoon
              v-else-if="theme.preference === 'dark'"
              class="w-5 h-5 text-neutral-400"
            />
            <IconsHalfMoon
              v-else
              class="w-5 h-5 fill-gray-600 dark:fill-neutral-400"
            />
          </button>
          <!-- Show / hide charts -->
          <label
            v-if="globalStore.statistics.chartType > 0"
            class="inline-flex items-center justify-center cursor-pointer w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 whitespace-nowrap transition group"
            :title="$t('toggleCharts')"
          >
            <input
              v-model="uiShowCharts"
              type="checkbox"
              value=""
              class="sr-only peer"
              @change="toggleCharts"
            />
            <IconsChart
              class="w-5 h-5 peer fill-gray-400 peer-checked:fill-gray-600 dark:fill-neutral-600 peer-checked:dark:fill-neutral-400 group-hover:dark:fill-neutral-500 transition"
            />
          </label>
          <UiUserMenu v-if="loggedIn" />
        </div>
      </div>
      <div class="text-sm text-gray-400 dark:text-neutral-400 mb-5" />
      <div
        v-if="globalStore.updateAvailable && globalStore.latestRelease"
        class="bg-red-800 dark:bg-red-100 p-4 text-white dark:text-red-600 text-sm font-small mb-10 rounded-md shadow-lg"
        :title="`v${globalStore.currentRelease} → v${globalStore.latestRelease.version}`"
      >
        <div class="container mx-auto flex flex-row flex-auto items-center">
          <div class="flex-grow">
            <p class="font-bold">{{ $t('updateAvailable') }}</p>
            <p>{{ globalStore.latestRelease.changelog }}</p>
          </div>

          <a
            :href="`https://github.com/wg-easy/wg-easy/releases/tag/${globalStore.latestRelease.version}`"
            target="_blank"
            class="p-3 rounded-md bg-white dark:bg-red-100 float-right font-sm font-semibold text-red-800 dark:text-red-600 flex-shrink-0 border-2 border-red-800 dark:border-red-600 hover:border-white dark:hover:border-red-600 hover:text-white dark:hover:text-red-100 hover:bg-red-800 dark:hover:bg-red-600 transition-all"
          >
            {{ $t('update') }} →
          </a>
        </div>
      </div>
    </header>
    <slot />
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
