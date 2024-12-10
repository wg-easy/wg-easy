<template>
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
    <IconsHalfMoon v-else class="h-5 w-5 fill-gray-600 dark:fill-neutral-400" />
  </button>
</template>

<script lang="ts" setup>
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
