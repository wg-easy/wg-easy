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
        <IconsAvatar class="w-10 h-10 m-5 text-white dark:text-white" />
      </div>

      <input
        v-model="username"
        type="text"
        name="username"
        :placeholder="$t('username')"
        autocomplete="username"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
      />

      <input
        v-model="password"
        type="password"
        name="password"
        :placeholder="$t('password')"
        autocomplete="current-password"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
      />

      <label
        class="inline-block mb-5 cursor-pointer whitespace-nowrap"
        :title="$t('titleRememberMe')"
      >
        <input v-model="remember" type="checkbox" class="sr-only" />

        <div
          v-if="remember"
          class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700 transition-all"
        >
          <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white"></div>
        </div>

        <div
          v-if="!remember"
          class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 dark:bg-neutral-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-neutral-500 transition-all"
        >
          <div class="rounded-full w-4 h-4 m-1 bg-white"></div>
        </div>

        <span class="text-sm">{{ $t('rememberMe') }}</span>
      </label>

      <button
        v-if="authenticating"
        class="bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed"
      >
        <IconsLoading class="w-5 animate-spin mx-auto" />
      </button>
      <input
        v-else
        type="submit"
        :class="[
          {
            'bg-red-800 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer':
              password,
            'bg-gray-200 dark:bg-neutral-800 cursor-not-allowed': !password,
          },
          'w-full rounded shadow py-2 text-sm text-white dark:text-white',
        ]"
        :value="$t('signIn')"
      />
    </form>
  </section>
</template>

<script setup lang="ts">
const authenticating = ref(false);
const remember = ref(false);
const username = ref<null | string>(null);
const password = ref<null | string>(null);
const authStore = useAuthStore();

async function login(e: Event) {
  e.preventDefault();

  if (!username.value || !password.value || authenticating.value) return;

  authenticating.value = true;
  try {
    const res = await authStore.login(
      username.value,
      password.value,
      remember.value
    );
    if (res) {
      await navigateTo('/');
    }
  } catch (err) {
    if (err instanceof Error) {
      // TODO: replace alert with actual ui error message
      alert(err.message || err.toString());
    }
  }
  authenticating.value = false;
  password.value = null;
}
</script>
