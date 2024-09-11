<template>
  <main class="container mx-auto px-4">
    <h1
      class="text-4xl font-medium my-16 text-gray-700 dark:text-neutral-200 text-center"
    >
      <img src="/logo.png" width="32" class="inline align-middle dark:bg" />
      <span class="align-middle">WireGuard</span>
    </h1>
    <div
      class="flex flex-col items-center lg:w-[60%] mx-auto shadow rounded-md bg-white dark:bg-neutral-700 p-5 overflow-hidden mt-10 text-gray-700 dark:text-neutral-200"
    >
      <h2
        class="mt-8 mb-16 text-3xl font-medium text-gray-700 dark:text-neutral-200"
      >
        {{ $t('setup.welcome') }}
      </h2>
      <p class="text-lg p-8">{{ $t('setup.msg') }}</p>
      <form class="mb-8" @submit="newAccount">
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
            :placeholder="$t('setup.usernamePlaceholder')"
            class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
            required="true"
          />
          <small v-if="errorCU" class="text-danger">{{
            $t('setup.usernameCondition')
          }}</small>
        </div>
        <div>
          <label for="password" class="inline-block py-2">{{
            $t('setup.newPassword')
          }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            name="password"
            autocomplete="new-password"
            :placeholder="$t('setup.passwordPlaceholder')"
            class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
            required="true"
          />
          <small v-if="errorPWD" class="text-danger">{{
            $t('setup.passwordCondition')
          }}</small>
        </div>
        <div>
          <label for="accept" class="inline-block my-4 mr-4">{{
            $t('setup.accept')
          }}</label>
          <input id="accept" type="checkbox" name="accept" required="true" />
        </div>
        <button
          type="submit"
          :class="[
            {
              'bg-red-800 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer':
                password && username,
              'bg-gray-200 dark:bg-neutral-800 cursor-not-allowed':
                !password && !username,
            },
            'w-max px-4 rounded shadow py-2 text-sm text-white dark:text-white',
          ]"
        >
          {{ $t('setup.submitBtn') }}
        </button>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
const username = ref<null | string>(null);
const password = ref<null | string>(null);
const authStore = useAuthStore();

const errorCU = ref(false);
const errorPWD = ref(false);

async function newAccount(e: Event) {
  e.preventDefault();

  if (!username.value || !password.value) return;

  try {
    const res = await authStore.signup(username.value, password.value);
    if (res) {
      navigateTo('/login');
    }
  } catch (error) {
    if (error instanceof Error) {
      // TODO: replace alert with actual ui error message
      // TODO: also use errorCU & errorPWD to show prompt error
      alert(error.message || error.toString());
    }
  }
}
</script>
