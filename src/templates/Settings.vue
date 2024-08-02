<!-- vue-cli-service build --dest src/www/js/vendor --no-module --formats umd-min --target lib --name VueSettings --filename vue-settings --no-clean src/templates/Settings.vue -->

<script>
export default {
  name: 'Settings',
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };
  },
  methods: {
    async updatePassword(e) {
      e.preventDefault();
      if (this.newPassword !== this.confirmNewPassword) {
        alert('Password Mismatch');
        return;
      }

      // temp username 'admin'
      this.api.updatePassword({
        username: 'admin',
        oldPassword: this.currentPassword,
        newPassword: this.newPassword
      }).then((_result) => {
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmNewPassword = '';
          alert('Password updated');
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
  <div class="w-full shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden">
    <div class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-neutral-500/50 dark:border-neutral-600">
      <div class="flex-grow">
        <p class="text-2xl font-medium dark:text-neutral-200">{{ $t('settings') }}</p>
      </div>
    </div>

    <div class="container p-2 flex flex-col md:items-center py-8">
      <form @submit="updatePassword" class="w-full md:w-[75%]">
        <div class="mb-4">
          <label for="currentPassword" class="block text-sm font-medium dark:text-neutral-200 mb-4">
            {{ $t('currentPassword') }}
          </label>
          <input id="currentPassword" v-model="currentPassword" type="password" :placeholder="$t('currentPassword')"
            class="outline-none focus:border-red-800 bg-transparent border border-neutral-500 p-2 rounded-md w-full" required />
        </div>

        <div class="mb-4">
          <label for="newPassword" class="block text-sm font-medium dark:text-neutral-200 mb-4">
            {{ $t('newPassword') }}
          </label>
          <input id="newPassword" v-model="newPassword" type="password" :placeholder="$t('newPassword')"
            class="outline-none focus:border-red-800 bg-transparent border border-neutral-500 p-2 rounded-md w-full" required />
        </div>

        <div class="mb-4">
          <label for="confirmNewPassword" class="block text-sm font-medium dark:text-neutral-200 mb-4">
            {{ $t('confirmNewPassword') }}
          </label>
          <input id="confirmNewPassword" v-model="confirmNewPassword" type="password" :placeholder="$t('confirmNewPassword')"
            class="outline-none focus:border-red-800 bg-transparent border border-neutral-500 p-2 rounded-md w-full" required />
        </div>

        <button type="submit" :disabled="!newPassword || !confirmNewPassword || newPassword != confirmNewPassword" :class="!newPassword || !confirmNewPassword || newPassword != confirmNewPassword ? 'bg-neutral-400 text-white p-2 rounded-md w-full transition' : 'bg-red-800 text-white p-2 rounded-md w-full transition'">
          {{ $t('updatePassword') }}
        </button>
      </form>
    </div>
  </div>
</template>
