<template>
  <div>
    <header
      class="mx-auto my-4 flex max-w-3xl flex-col justify-center max-md:px-3"
    >
      <div
        class="mb-5 w-full"
        :class="
          loggedIn
            ? 'flex flex-col items-center justify-between sm:flex-row'
            : 'flex justify-end'
        "
      >
        <HeaderLogo v-if="loggedIn" />
        <div class="flex flex-row gap-3">
          <HeaderLangSelector />
          <HeaderThemeSwitch />
          <HeaderChartToggle v-if="loggedIn" />
          <UiUserMenu v-if="loggedIn" />
        </div>
      </div>
      <HeaderUpdate class="my-4" />
    </header>
    <slot />
    <UiFooter />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const loggedIn = computed(() => route.path !== '/login');
</script>
