<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupCreateAdminUser') }}
    </p>
    <form id="newAccount"></form>
    <div>
      <Label for="username">{{ $t('username') }}</Label>
      <input
        v-model="username"
        form="newAccount"
        type="text"
        autocomplete="username"
        :class="inputClass"
      />
    </div>
    <div>
      <Label for="password">{{ $t('setup.newPassword') }}</Label>
      <input
        v-model="password"
        form="newAccount"
        type="password"
        autocomplete="new-password"
        :class="inputClass"
      />
    </div>
    <div>
      <Label for="accept">{{ $t('setup.accept') }}</Label>
      <input v-model="accept" form="newAccount" type="checkbox" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch';

const setupStore = useSetupStore();
const authStore = useAuthStore();
const { t } = useI18n();

const inputClass =
  'px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-200 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0';

const emit = defineEmits(['validated']);

const props = defineProps<{
  next: boolean;
}>();

const next = toRef(props, 'next');

watch(next, async (newVal) => {
  if (newVal) {
    await newAccount();
  }
});

const username = ref<null | string>(null);
const password = ref<null | string>(null);
const accept = ref<boolean>(true);

async function newAccount() {
  try {
    if (!username.value || !password.value) {
      emit('validated', {
        title: t('setup.requirements'),
        message: t('setup.emptyFields'),
      });
      return;
    }

    await setupStore.signup(username.value, password.value, accept.value);
    // the next step need authentication
    await authStore.login(username.value, password.value, false);
    emit('validated', null);
  } catch (error) {
    if (error instanceof FetchError) {
      emit('validated', {
        title: t('setup.requirements'),
        message: error.data.message,
      });
    }
  }
}
</script>
