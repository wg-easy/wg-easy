<template>
  <DropdownMenuRoot v-model:open="toggleState">
    <DropdownMenuTrigger>
      <button
        class="flex items-center rounded-full pe-1 text-sm font-medium text-gray-400 hover:text-red-800 focus:ring-4 focus:ring-gray-100 md:me-0 dark:text-neutral-400 dark:hover:text-red-800 dark:focus:ring-gray-700"
        type="button"
      >
        <BaseAvatar class="h-8 w-8">
          {{ fallbackName }}
        </BaseAvatar>
        {{ authStore.userData?.name }}
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="5"
        class="z-10 w-44 divide-y divide-gray-100 rounded-lg bg-white text-gray-700 shadow dark:divide-neutral-800 dark:bg-neutral-700 dark:text-gray-200"
      >
        <DropdownMenuItem>
          <div class="truncate">{{ authStore.userData?.name }}</div>
          <div class="truncate">@{{ authStore.userData?.username }}</div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <NuxtLink
            to="/"
            class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Clients
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <NuxtLink
            to="/me"
            class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Account
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuItem v-if="authStore.userData?.role === 'ADMIN'">
          <NuxtLink
            to="/admin"
            class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Admin Panel
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <button
            class="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            @click.prevent="logout"
          >
            <IconsLogout class="h-5" />
            {{ $t('logout') }}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
const toggleState = ref(false);

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

const fallbackName = computed(() => {
  return authStore.userData?.name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
});
</script>
