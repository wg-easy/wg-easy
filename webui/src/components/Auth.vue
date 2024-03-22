<template>
  <div>
    <h1 class="text-4xl font-medium my-16 text-gray-700 dark:text-neutral-200 text-center">WireGuard</h1>

    <form
      class="shadow rounded-md bg-white dark:bg-neutral-700 mx-auto w-64 p-5 overflow-hidden mt-10"
      @submit="store.login"
    >
      <!-- Avatar -->
      <div class="h-20 w-20 mb-10 mt-5 mx-auto rounded-full bg-red-800 dark:bg-red-800 relative overflow-hidden">
        <IconAvatarDefault class="w-10 h-10 m-5 text-white dark:text-white" />
      </div>

      <input
        v-model="password"
        type="password"
        name="password"
        placeholder="Password"
        class="px-3 py-2 text-sm dark:bg-neutral-700 text-gray-500 dark:text-gray-500 mb-5 border-2 border-gray-100 dark:border-neutral-800 rounded-lg w-full focus:border-red-800 dark:focus:border-red-800 dark:placeholder:text-neutral-400 outline-none"
      />

      <button
        v-if="authenticating"
        class="bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed"
      >
        <LoadingSpinner />
      </button>
      <input
        v-if="!authenticating && password"
        type="submit"
        class="bg-red-800 dark:bg-red-800 w-full rounded shadow py-2 text-sm text-white dark:text-white hover:bg-red-700 dark:hover:bg-red-700 transition cursor-pointer"
        value="Sign In"
      />
      <input
        v-if="!authenticating && !password"
        type="submit"
        class="bg-gray-200 dark:bg-neutral-800 w-full rounded shadow py-2 text-sm text-white dark:text-white cursor-not-allowed"
        value="Sign In"
      />
    </form>
  </div>
</template>

<script setup>
import IconAvatarDefault from '@/components/icons/IconAvatarDefault.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const { password, authenticating } = storeToRefs(store);
</script>
