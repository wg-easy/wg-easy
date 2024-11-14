<template>
  <main class="container mx-auto px-4">
    <UiBanner />
    <Panel>
      <PanelBody class="mx-auto mt-10 p-4 md:w-[70%] lg:w-[60%]">
        <h2 class="mb-16 mt-8 text-3xl font-medium">
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

    <BaseToast ref="toast" />
  </main>
</template>

<script lang="ts" setup>
const setupStore = useSetupStore();
const savedRef = useTemplateRef('toast');
setupStore.setErrorRef(savedRef);
</script>
