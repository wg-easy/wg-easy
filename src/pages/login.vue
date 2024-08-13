<template>
  <section>
    <h1
      class="text-4xl font-medium my-16 text-gray-700 dark:text-neutral-200 text-center"
    >
      <img src="/logo.png" width="32" class="inline align-middle dark:bg" />
      <span class="align-middle">WireGuard</span>
    </h1>

    <form
      class="shadow rounded-md bg-white dark:bg-neutral-700 mx-auto w-64 p-5 overflow-hidden mt-10"
      @submit="login"
    >
      <!-- Avatar -->
      <div
        class="h-20 w-20 mb-10 mt-5 mx-auto rounded-full bg-red-800 dark:bg-red-800 relative overflow-hidden"
      >
        <svg
          class="w-10 h-10 m-5 text-white dark:text-white"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      <input
        v-model="password"
        type="password"
        name="password"
        :placeholder="$t('password')"
        autocomplete="current-password"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
      />

      <button
        v-if="authenticating"
        class="bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed"
      >
        <svg
          class="w-5 animate-spin mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </button>
      <input
        v-if="!authenticating && password"
        type="submit"
        class="bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer"
        :value="$t('signIn')"
      />
      <input
        v-if="!authenticating && !password"
        type="submit"
        class="bg-gray-200 dark:bg-neutral-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed"
        :value="$t('signIn')"
      />
    </form>
  </section>
</template>

<script setup lang="ts">
const authenticated = ref<null | boolean>(null);
const authenticating = ref(false);
const password = ref<null | string>(null);
const requiresPassword = ref<null | boolean>(null);

function login(e: Event) {
  e.preventDefault();

  if (!password.value) return;
  if (authenticating.value) return;

  authenticating.value = true;
  api
    .createSession({
      password: password.value,
    })
    .then(async () => {
      const session = await api.getSession();
      authenticated.value = session.authenticated;
      requiresPassword.value = session.requiresPassword;
      window.location.replace('/');
    })
    .catch((err) => {
      // TODO: replace alert with actual ui error message
      alert(err.message || err.toString());
    })
    .finally(() => {
      authenticating.value = false;
      password.value = null;
    });
}

onMounted(() => {
  api.getSession().then((session) => {
    if (session.authenticated || !session.requiresPassword) {
      window.location.replace('/');
    }
  });
});
</script>
