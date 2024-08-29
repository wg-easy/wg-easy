<template>
  <main>
    <div>
      <h1>Welcome to your first setup of wg-easy !</h1>
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
          />
        </div>
        <div>
          <label for="accept">I accept the condition.</label>
          <input id="accept" type="checkbox" name="accept" />
        </div>
        <button type="submit">Save</button>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
const username = ref<string>();
const password = ref<string>();
const authStore = useAuthStore();

async function newAccount(e: Event) {
  e.preventDefault();

  if (!username.value) return;
  if (!password.value) return;

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
