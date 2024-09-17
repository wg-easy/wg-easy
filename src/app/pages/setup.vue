<template>
  <main class="container mx-auto px-4">
    <UiBanner />
    <Panel>
      <PanelBody class="md:w-[70%] lg:w-[60%] mx-auto mt-10 p-4">
        <h2 class="mt-8 mb-16 text-3xl font-medium">
          {{ $t('setup.welcome') }}
        </h2>

        <div class="tab">
          <p class="text-lg p-8">{{ $t('setup.msg') }}</p>
          <form>
            <div>
              <label for="username" class="inline-block py-2">{{
                $t('username')
              }}</label>
              <input
                id="username"
                v-model="username"
                type="text"
                name="username"
                autocomplete="username"
                autofocus
                :placeholder="$t('setup.usernamePlaceholder')"
                class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
              />
            </div>
            <div>
              <Label for="password" class="inline-block py-2">{{
                $t('setup.newPassword')
              }}</Label>
              <input
                id="password"
                v-model="password"
                type="password"
                name="password"
                autocomplete="new-password"
                :placeholder="$t('setup.passwordPlaceholder')"
                class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
              />
            </div>
            <div>
              <Label for="accept" class="inline-block my-4 mr-4">{{
                $t('setup.accept')
              }}</Label>
              <input
                id="accept"
                v-model="accept"
                type="checkbox"
                name="accept"
              />
            </div>
          </form>
        </div>

        <div class="tab hidden">
          <p class="text-lg p-8">Host/Port section</p>
        </div>

        <div class="tab hidden">
          <p class="text-lg p-8">Migration section</p>
        </div>

        <div class="tab hidden">
          <p class="text-lg p-8">Validation section</p>
        </div>

        <div class="flex justify-between items-center">
          <IconsArrowLeftCircle class="size-12" />
          <div class="step grow h-[3px] mx-4 bg-white"></div>
          <div class="step grow h-[3px] mx-4 bg-gray-500"></div>
          <div class="step grow h-[3px] mx-4 bg-gray-500"></div>
          <div class="step grow h-[3px] mx-4 bg-gray-500"></div>
          <IconsArrowRightCircle class="size-12" />
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

const { t } = useI18n();

const username = ref<null | string>(null);
const password = ref<null | string>(null);
const accept = ref<boolean>(true);
const authStore = useAuthStore();

type SetupError = {
  title: string;
  message: string;
};

const setupError = ref<null | SetupError>(null);

watch(setupError, (value) => {
  if (value) {
    setTimeout(() => {
      setupError.value = null;
    }, 13000);
  }
});

async function _newAccount() {
  if (!username.value || !password.value) return;

  try {
    const res = await authStore.signup(
      username.value,
      password.value,
      accept.value
    );
    if (res) {
      navigateTo('/login');
    }
  } catch (error) {
    if (error instanceof FetchError) {
      setupError.value = {
        title: t('setup.requirements'),
        message: error.data.message,
      };
    }
  }
}
</script>
