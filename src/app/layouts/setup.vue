<template>
  <main class="container mx-auto px-4">
    <UiBanner />
    <Panel>
      <PanelBody class="md:w-[70%] lg:w-[60%] mx-auto mt-10 p-4">
        <h2 class="mt-8 mb-16 text-3xl font-medium">
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

    <ErrorToast
      v-if="setupStore.error"
      :title="setupStore.error.title"
      :message="setupStore.error.message"
    />
  </main>
</template>

<script lang="ts" setup>
const setupStore = useSetupStore();
</script>
