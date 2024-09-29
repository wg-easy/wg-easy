<template>
  <main class="container mx-auto px-4">
    <UiBanner />
    <Panel>
      <PanelBody class="md:w-[70%] lg:w-[60%] mx-auto mt-10 p-4">
        <h2 class="mt-8 mb-16 text-3xl font-medium">
          {{ $t('setup.welcome') }}
        </h2>

        <SetupChooseLang
          v-if="step === 1"
          :next="nextStep"
          @validated="handleValidatedStep"
        />

        <SetupCreateAdminUser
          v-if="step === 2"
          :next="nextStep"
          @validated="handleValidatedStep"
        />

        <SetupUpdateHostPort
          v-if="step === 3"
          :next="nextStep"
          @validated="handleValidatedStep"
        />

        <div v-if="step === 4">
          <p class="text-lg p-8 text-center">Migration section</p>
        </div>

        <div v-if="step === 5">
          <p class="text-lg p-8 text-center">Validation section</p>
        </div>

        <div class="flex justify-between items-center">
          <IconsArrowLeftCircle
            :class="[
              'size-12',
              step === 1 || towardStepValide()
                ? 'text-gray-500'
                : 'text-red-800 dark:text-white',
            ]"
            @click="decreaseStep"
          />
          <UiStepProgress :step="step" />
          <IconsArrowRightCircle
            :class="[
              'size-12',
              step === 4 ? 'text-gray-500' : 'text-red-800 dark:text-white',
            ]"
            @click="increaseStep"
          />
        </div>
      </PanelBody>
    </Panel>

    <ErrorToast
      v-if="setupError"
      :title="setupError.title"
      :message="setupError.message"
    />
  </main>
</template>

<script setup lang="ts">
type SetupError = {
  title: string;
  message: string;
};

/* STEP MANAGEMENT */
const step = ref(1);
const stepInvalide = ref<number[]>([]);
const setupError = ref<null | SetupError>(null);
const nextStep = ref(false);

async function increaseStep() {
  nextStep.value = true;
}

function decreaseStep() {
  if (stepInvalide.value.includes(step.value - 1)) return;
  if (step.value > 1) step.value -= 1;
}

function towardStepValide() {
  return stepInvalide.value.includes(step.value - 1);
}

function handleValidatedStep(error: null | SetupError) {
  if (error) {
    setupError.value = error;
  }

  if (!error) {
    nextStep.value = false;
    if (step.value < 5) {
      stepInvalide.value.push(step.value);
      step.value += 1;
    }
  }
}
</script>
