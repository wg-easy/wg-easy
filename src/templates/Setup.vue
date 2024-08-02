<!-- vue-cli-service build --dest src/www/js/vendor --no-module --formats umd-min --target lib --name VueSetup --filename vue-setup --no-clean src/templates/Setup.vue -->

<script>
export default {
  name: 'Setup',
  data() {
    return {
      username: '',
      newPassword: '',
      confirmNewPassword: '',
    };
  },
  methods: {
    async addAdminUser(e) {
      e.preventDefault();
      if (this.newPassword !== this.confirmNewPassword) {
        alert('Password Mismatch');
        return;
      }

      this.api.addAdminUser({
        username: this.username,
        password: this.newPassword
      }).then((_result) => {
        this.username = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        alert('User created');
        window.location.reload();
      }).catch((err) => {
        alert(err.message || err.toString());
      });
    },
  },
  mounted() {
    this.api = new API();
  },
};
</script>

<template>
  <div>
    <h1 class="text-4xl font-medium my-16 text-gray-700 dark:text-neutral-200 text-center">
      <span class="align-middle">{{ $t("setup") }}</span>
    </h1>

    <form @submit="addAdminUser"
      class="shadow rounded-md bg-white dark:bg-neutral-700 mx-auto w-72 p-5 overflow-hidden mt-10">
      <div class="h-20 w-20 mb-10 mt-5 mx-auto rounded-full bg-red-800 dark:bg-red-800 relative overflow-hidden">
        <svg class="w-10 h-10 m-5 text-white dark:text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
          fill="currentColor">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </div>

      <div class="mb-4">
        <label for="username" class="block mb-2 text-gray-500 dark:text-white">{{ $t('setupUsername') }}</label>
        <input id="username" name="username" :placeholder="$t('setupUsername')" v-model="username" required
          autocomplete="username"
          class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none" />
      </div>

      <div class="mb-4">
        <label for="newPassword" class="block mb-2 text-gray-500 dark:text-white">{{ $t('newPassword') }}</label>
        <input id="newPassword" type="password" name="newPassword" :placeholder="$t('newPassword')"
          v-model="newPassword" required autocomplete="new-password"
          class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none" />
      </div>

      <div class="mb-4">
        <label for="confirmNewPassword" class="block mb-2 text-gray-500 dark:text-white">{{ $t('confirmNewPassword')
          }}</label>
        <input id="confirmNewPassword" type="password" name="confirmNewPassword" :placeholder="$t('confirmNewPassword')"
          v-model="confirmNewPassword" required autocomplete="new-password"
          class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none" />
      </div>

      <button type="submit" :disabled="!newPassword || !confirmNewPassword || newPassword != confirmNewPassword"
        :class="!newPassword || !confirmNewPassword || newPassword != confirmNewPassword ? 'bg-gray-200 dark:bg-neutral-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed' : 'bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer'">
        {{ $t("setupBtnCU") }}
      </button>
      <small class="text-yellow-600">{{ $t("setupRequiredPatternPassword") }}</small>
    </form>
  </div>
</template>
