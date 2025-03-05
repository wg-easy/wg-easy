<template>
  <div>
    <header class="container mx-auto mt-4 max-w-3xl px-3 xs:mt-6 md:px-0">
      <div
        class="mb-5"
        :class="
          loggedIn
            ? 'flex flex-auto flex-col-reverse items-center gap-3 xxs:flex-row'
            : 'flex justify-end'
        "
      >
        <HeaderLogo v-if="loggedIn" />
        <div class="flex grow-0 items-center gap-3 self-end xxs:self-center">
          <HeaderLangSelector />
          <HeaderThemeSwitch />
          <HeaderChartToggle v-if="loggedIn" />
          <UiUserMenu v-if="loggedIn" />
        </div>
      </div>
      <HeaderUpdate class="mt-5" />
    </header>
    <slot />
    <UiFooter />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const loggedIn = computed(() => route.path !== '/login');
</script>
