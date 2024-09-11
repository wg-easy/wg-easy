<template>
  <button
    class="flex items-center pe-1 font-medium text-sm text-gray-400 rounded-full hover:text-red-800 dark:hover:text-red-800 md:me-0 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:text-neutral-400"
    type="button"
    @click.prevent="toggleMenu"
  >
    <IconsAvatar class="w-8 h-8 me-2 rounded-full" />
    {{ authStore.userData?.name }}
    <svg
      class="w-2.5 h-2.5 ms-3"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 10 6"
    >
      <path
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="m1 1 4 4 4-4"
      />
    </svg>
  </button>

  <!-- Dropdown menu -->
  <div
    v-show="menuOpen"
    class="z-10 bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-neutral-700 dark:divide-neutral-800"
  >
    <div class="px-4 py-3 text-sm text-gray-900 dark:text-white">
      <div class="truncate">{{ authStore.userData?.name }}</div>
      <div class="truncate">@{{ authStore.userData?.username }}</div>
    </div>
    <ul class="py-2 text-sm text-gray-700 dark:text-gray-200">
      <li>
        <NuxtLink
          to="/"
          class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          @click="closeMenu"
        >
          Clients
        </NuxtLink>
      </li>
      <li v-if="authStore.userData?.role === 'ADMIN'">
        <NuxtLink
          to="/admin"
          class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          @click="closeMenu"
        >
          Admin Panel
        </NuxtLink>
      </li>
    </ul>
    <div class="py-2">
      <button
        class="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
        @click.prevent="logout"
      >
        <IconsLogout class="h-5" />
        {{ $t('logout') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
const menuOpen = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

async function logout() {
  try {
    await authStore.logout();
    navigateTo('/login');
  } catch (err) {
    if (err instanceof Error) {
      // TODO: better ui
      alert(err.message || err.toString());
    }
  }
}
</script>
