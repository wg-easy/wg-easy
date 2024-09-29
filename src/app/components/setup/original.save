<template>
  <main class="container mx-auto px-4">
    <UiBanner />
    <Panel>
      <PanelBody class="md:w-[70%] lg:w-[60%] mx-auto mt-10 p-4">
        <h2 class="mt-8 mb-16 text-3xl font-medium">
          {{ $t('setup.welcome') }}
        </h2>

        <div v-if="step === 1">
          <p class="text-lg p-8 text-center">
            {{ $t('setup.messageSetupLanguage') }}
          </p>
          <div class="flex justify-center mb-8">
            <UiChooseLang :lang="lang" @update:lang="handleEventUpdateLang" />
          </div>
        </div>

        <div v-if="step === 2">
          <p class="text-lg p-8 text-center">
            {{ $t('setup.messageSetupCreateAdminUser') }}
          </p>
          <div>
            <Label for="username" class="inline-block py-2">{{
              $t('username')
            }}</Label>
            <input
              id="username"
              v-model="username"
              form="form-create-admin-user"
              type="text"
              name="username"
              autocomplete="username"
              autofocus
              :placeholder="$t('setup.usernamePlaceholder')"
              :class="inputClass"
            />
          </div>
          <div>
            <Label for="password" class="inline-block py-2">{{
              $t('setup.newPassword')
            }}</Label>
            <input
              id="password"
              v-model="password"
              form="form-create-admin-user"
              type="password"
              name="password"
              autocomplete="new-password"
              :placeholder="$t('setup.passwordPlaceholder')"
              :class="inputClass"
            />
          </div>
          <div>
            <Label for="accept" class="inline-block my-4 mr-4">{{
              $t('setup.accept')
            }}</Label>
            <input id="accept" v-model="accept" type="checkbox" name="accept" />
          </div>
          <form id="form-create-admin-user"></form>
        </div>

        <div v-if="step === 3">
          <p class="text-lg p-8 text-center">
            {{ $t('setup.messageSetupHostPort') }}
          </p>
          <div>
            <Label for="host">{{ $t('setup.host') }}</Label>
            <input
              id="host"
              v-model="host"
              form="form-set-host-port"
              type="text"
              name="host"
              autofocus
              :placeholder="t('setup.hostPlaceholder')"
              :class="inputClass"
            />
          </div>
          <div>
            <Label for="port">{{ $t('setup.port') }}</Label>
            <input
              id="port"
              v-model="port"
              form="form-set-host-port"
              type="number"
              name="port"
              min="1"
              max="65535"
              :placeholder="t('setup.portPlaceholder')"
              :class="inputClass"
            />
          </div>
          <form id="form-set-host-port"></form>
        </div>

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
      :duration="12000"
    />
  </main>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const { t, locale, setLocale } = useI18n();
const authStore = useAuthStore();
const setupStore = useSetupStore();
const globalStore = useGlobalStore();

const inputClass =
  'px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0';

type SetupError = {
  title: string;
  message: string;
};

const lang = ref(locale.value);

/* STEP CREATE ADMIN USER MODELS */
const username = ref<null | string>(null);
const password = ref<null | string>(null);
const accept = ref<boolean>(true);

/* STEP SET HOST & PORT MODELS */
const host = ref<null | string>(null);
const port = ref<null | number>(null);

const step = ref(1);
const stepInvalide = ref<number[]>([]);
const setupError = ref<null | SetupError>(null);

// TODO: improve error handling
watch(setupError, (value) => {
  if (value) {
    setTimeout(() => {
      setupError.value = null;
    }, 13000);
  }
});

function handleEventUpdateLang(value: string) {
  lang.value = value;
  setLocale(lang.value);
}

async function increaseStep() {
  try {
    if (step.value === 1) {
      await updateLang();
      stepInvalide.value.push(1);
    }

    if (step.value === 2) {
      await newAccount();
      stepInvalide.value.push(2);
    }

    if (step.value === 3) {
      await updateHostPort();
      stepInvalide.value.push(3);
    }

    if (step.value === 4) {
      /* migration */
      stepInvalide.value.push(4);
    }

    if (step.value === 5) {
      /* validation/welcome */
      navigateTo('/login');
      stepInvalide.value.push(5);
    }

    if (step.value < 5) step.value += 1;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    /* throw in functions */
  }
}

// TODO: improve while user reload the page, might use server check
/* Check if previous steps are invalide (mean successful executed). */
function towardStepValide() {
  return stepInvalide.value.includes(step.value - 1);
}

function decreaseStep() {
  if (towardStepValide()) return;

  if (step.value > 1) step.value -= 1;
}

async function updateLang() {
  try {
    await globalStore.updateLang(lang.value);
  } catch (error) {
    if (error instanceof FetchError) {
      setupError.value = {
        title: t('setup.requirements'),
        message: error.data.message,
      };
    }
    // increaseStep fn
    throw error;
  }
}

async function newAccount() {
  if (!username.value || !password.value) return;

  try {
    await setupStore.signup(username.value, password.value, accept.value);
    // the next step need authentication
    await authStore.login(username.value, password.value, false);
  } catch (error) {
    if (error instanceof FetchError) {
      setupError.value = {
        title: t('setup.requirements'),
        message: error.data.message,
      };
    }
    // increaseStep fn
    throw error;
  }
}

async function updateHostPort() {
  if (!host.value || !port.value) return;
  try {
    await setupStore.updateHostPort(host.value, port.value);
  } catch (error) {
    if (error instanceof FetchError) {
      setupError.value = {
        title: t('setup.requirements'),
        message: error.data.message,
      };
    }
    // increaseStep fn
    throw error;
  }
}
</script>
