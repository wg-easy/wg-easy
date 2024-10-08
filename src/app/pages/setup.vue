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

        <SetupValidation
          v-if="step === 4"
          :next="nextStep"
          @validated="handleValidatedStep"
        />

        <div class="flex justify-between items-center mt-12">
          <IconsArrowLeftCircle
            :class="[
              'size-12',
              step === 1
                ? 'text-gray-500'
                : 'text-red-800 hover:text-red-600 dark:text-white dark:hover:text-red-800',
            ]"
            @click="decreaseStep"
          />
          <UiStepProgress :step="step" :total-steps="totalSteps" />
          <IconsArrowRightCircle
            v-if="step < totalSteps"
            class="size-12 text-red-800 hover:text-red-600 dark:text-white dark:hover:text-red-800"
            @click="increaseStep"
          />
          <IconsCheckCircle
            v-if="step == totalSteps"
            class="size-12 text-red-800 hover:text-red-600 dark:text-white dark:hover:text-red-800"
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
const totalSteps = ref(4);
const stepValide = ref<number[]>([]);
const setupError = ref<null | SetupError>(null);
const nextStep = ref(false);

watch(setupError, (newVal) => {
  if (newVal) {
    const id = setTimeout(() => {
      setupError.value = null;
      clearTimeout(id);
    }, 8000);
  }
});

async function increaseStep() {
  if (step.value === totalSteps.value) {
    navigateTo('/login');
  }

  if (stepValide.value.includes(step.value)) {
    nextStep.value = false;
    step.value += 1;
    return;
  }

  // handleValidatedStep()
  nextStep.value = true;
}

function decreaseStep() {
  if (step.value > 1) {
    nextStep.value = false;
    step.value -= 1;
  }
}

function handleValidatedStep(error: null | SetupError) {
  nextStep.value = false;

  if (error) {
    setupError.value = error;
    return;
  }

  if (!error) {
    if (step.value === 2 || step.value === 3) {
      // if new admin user has been created, allow to skip this step if user returns to the previous steps
      stepValide.value.push(step.value);
    }

    if (step.value < totalSteps.value) {
      step.value += 1;
    }
  }
}
</script>
