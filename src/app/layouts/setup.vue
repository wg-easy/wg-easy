<template>
  <div>
    <header class="container mx-auto mt-4 max-w-3xl px-3 xs:mt-6 md:px-0">
      <div class="mb-5 flex justify-end">
        <div class="flex grow-0 items-center gap-3 self-end xxs:self-center">
          <HeaderLangSelector />
          <HeaderThemeSwitch />
        </div>
      </div>
      <UiBanner />
    </header>
    <main>
      <Panel>
        <PanelBody class="m-4 mx-auto mt-10 md:w-[70%] lg:w-[60%]">
          <h2 class="mb-16 mt-8 text-center text-3xl font-medium">
            {{ $t('setup.welcome') }}
          </h2>

          <slot />

          <div class="mt-12 flex">
            <UiStepProgress
              :step="setupStore.step"
              :total-steps="setupStore.totalSteps"
            />
          </div>
        </PanelBody>
      </Panel>
    </main>
    <UiFooter />
  </div>
</template>

<script lang="ts" setup>
const setupStore = useSetupStore();
</script>
