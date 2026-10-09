<template>
  <div class="app-shell">
    <header
      class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-7"
    >
      <HeaderLogo />
      <div class="flex items-center gap-2">
        <HeaderLangSelector /><HeaderThemeSwitch />
      </div>
    </header>
    <main class="flex flex-1 items-center justify-center px-4 py-10">
      <div class="surface w-full max-w-lg p-6 shadow-xl sm:p-9">
        <p class="eyebrow mb-3">{{ $t('ui.setup') }}</p>
        <h1 class="mb-8 text-2xl font-semibold tracking-tight">
          {{ $t('setup.welcome') }}
        </h1>
        <slot />
        <div class="mt-9 flex gap-2">
          <UiStepProgress
            :step="setupStore.step"
            :total-steps="setupStore.totalSteps"
          />
        </div>
      </div>
    </main>
    <UiFooter />
  </div>
</template>

<script lang="ts" setup>
const setupStore = useSetupStore();
</script>
