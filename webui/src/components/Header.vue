<template>
  <div>
    <span
      v-if="requiresPassword"
      class="text-sm text-gray-400 dark:text-neutral-400 mb-10 mr-2 mt-3 cursor-pointer hover:underline float-right"
      @click="logout"
    >
      Logout
      <IconLogout />
    </span>
    <h1 class="text-4xl dark:text-neutral-200 font-medium mt-2 mb-2">
      <img src="@/assets/img/logo.png" width="32" class="inline align-middle dark:bg" />
      <span class="align-middle">WireGuard</span>
    </h1>
    <h2 class="text-sm text-gray-400 dark:text-neutral-400 mb-10"></h2>
  </div>
</template>

<script setup>
import IconLogout from './icons/IconLogout.vue';

import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const { requiresPassword } = storeToRefs(store);

const logout = store.logout;
</script>

<style lang="scss" scoped></style>
