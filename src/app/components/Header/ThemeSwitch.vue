<template>
  <button
    class="header-control w-10 rounded-full"
    :title="$t(`theme.${theme.preference}`)"
    :aria-label="$t(`theme.${theme.preference}`)"
    @click="toggleTheme"
  >
    <SunIcon v-if="theme.preference === 'light'" class="size-4" />
    <MoonIcon v-else-if="theme.preference === 'dark'" class="size-4" />
    <IconsHalfMoon v-else class="size-4 fill-current" />
  </button>
</template>

<script lang="ts" setup>
import { MoonIcon, SunIcon } from '@lucide/vue';

const theme = useTheme();

function toggleTheme() {
  const themeCycle = {
    system: 'light',
    light: 'dark',
    dark: 'system',
  } as const;

  theme.preference = themeCycle[theme.preference];
}
</script>
