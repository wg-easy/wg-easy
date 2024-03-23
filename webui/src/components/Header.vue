<template>
  <div class="flex flex-col-reverse xxs:flex-row flex-auto items-center items-end gap-3">
    <h1 class="text-4xl dark:text-neutral-200 font-medium flex-grow self-start mb-4">
      <img src="@/assets/img/logo.png" width="32" class="inline align-middle dark:bg mr-2" /><span class="align-middle"
        >WireGuard</span
      >
    </h1>
    <div class="flex items-center grow-0 gap-3 items-end self-end xxs:self-center">
      <!-- Dark / light theme -->
      <button
        class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition"
        :title="$t(`theme.${uiTheme}`)"
        @click="toggleTheme"
      >
        <IconUITheme :theme="uiTheme" />
      </button>
      <!-- Show / hide charts -->
      <label
        v-if="uiChartType > 0"
        class="inline-flex items-center justify-center cursor-pointer w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 whitespace-nowrap transition group"
        :title="$t('toggleCharts')"
      >
        <input v-model="uiShowCharts" type="checkbox" value="" class="sr-only peer" @change="toggleCharts" />
        <IconChart />
      </label>
      <span
        v-if="requiresPassword"
        class="text-sm text-gray-400 dark:text-neutral-400 cursor-pointer hover:underline"
        @click="logout"
      >
        {{ $t('logout') }}
        <IconLogout />
      </span>
    </div>
  </div>
  <!-- <div>
    <span
      v-if="requiresPassword"
      class="text-sm text-gray-400 dark:text-neutral-400 mb-10 mr-2 mt-3 cursor-pointer hover:underline float-right"
      @click="logout"
    >
      Logout
      <IconLogout />
    </span>
    <h1 class="text-4xl dark:text-neutral-200 font-medium mt-2 mb-2">
      <img src="@/assets/img/logo.png" width="32" class="inline align-middle dark:bg" />
      <span class="align-middle">WireGuard</span>
    </h1>
    <h2 class="text-sm text-gray-400 dark:text-neutral-400 mb-10"></h2>
  </div> -->
</template>

<script setup>
import IconLogout from '@/components/icons/IconLogout.vue';
import IconUITheme from '@/components/icons/IconUITheme.vue';
import IconChart from './icons/IconChart.vue';

import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const { requiresPassword, uiTheme, uiShowCharts, uiChartType } = storeToRefs(store);

const logout = store.logout;
const toggleTheme = store.toggleTheme;
const toggleCharts = store.toggleCharts;
</script>

<style lang="scss" scoped></style>
