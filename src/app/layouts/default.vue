<template>
  <div class="app-shell">
    <a
      href="#main-content"
      class="ui-button ui-button-primary fixed top-2 left-2 z-[100] -translate-y-24 focus:translate-y-0"
      >{{ $t('ui.skipToContent') }}</a
    >
    <header
      class="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-4 px-4 py-5 sm:px-7 lg:gap-x-8 lg:py-6"
    >
      <HeaderLogo />
      <div class="ml-auto flex items-center gap-2">
        <HeaderLangSelector /><HeaderThemeSwitch /><HeaderChartToggle
          v-if="loggedIn"
        /><UiUserMenu v-if="loggedIn" />
      </div>
    </header>
    <div v-if="loggedIn" class="mx-auto w-full max-w-6xl px-4 sm:px-7">
      <HeaderUpdate />
    </div>
    <div id="main-content" class="flex-1" tabindex="-1"><slot /></div>
    <UiFooter />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const loggedIn = computed(
  () => route.path !== '/login' && route.path !== '/login/2fa'
);
</script>
