<template>
  <main>
    <h1
      class="text-4xl font-medium my-16 text-gray-700 dark:text-neutral-200 text-center"
    >
      <img src="/logo.png" width="32" class="inline align-middle dark:bg" />
      <span class="align-middle">WireGuard</span>
    </h1>
    <div
      class="shadow rounded-md bg-white dark:bg-neutral-700 mx-auto w-96 p-5 overflow-hidden mt-10 text-gray-700 dark:text-neutral-200"
    >
      <h2>Welcome to your first setup of wg-easy !</h2>
      <p>Please first enter an admin username and a strong password.</p>
      <form @submit="newAccount">
        <div>
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
          />
        </div>
        <div>
          <label for="password">New Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            name="password"
            autocomplete="new-password"
            class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
          />
        </div>
        <div>
          <label for="accept">I accept the condition</label>
          <input id="accept" type="checkbox" name="accept" />
        </div>
        <input
          type="submit"
          value="Save"
          :class="[
            {
              'bg-red-800 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer':
                password && username,
              'bg-gray-200 dark:bg-neutral-800 cursor-not-allowed':
                !password && !username,
            },
            'w-full rounded shadow py-2 text-sm text-white dark:text-white',
          ]"
        />
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
const username = ref<null | string>(null);
const password = ref<null | string>(null);
const authStore = useAuthStore();

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
      alert(error.message || error.toString());
    }
  }
}
</script>
