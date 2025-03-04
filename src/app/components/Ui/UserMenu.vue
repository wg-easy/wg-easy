<template>
  <DropdownMenuRoot v-model:open="toggleState">
    <DropdownMenuTrigger>
      <span
        class="flex items-center rounded-full pe-1 text-sm font-medium text-gray-400 hover:text-red-800 focus:ring-4 focus:ring-gray-100 md:me-0 dark:text-neutral-400 dark:hover:text-red-800 dark:focus:ring-gray-700"
      >
        <BaseAvatar class="h-8 w-8">
          {{ fallbackName }}
        </BaseAvatar>
        {{ authStore.userData?.name }}
      </span>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="5"
        class="z-10 w-44 divide-y divide-gray-100 rounded-lg bg-white text-gray-700 shadow dark:divide-neutral-800 dark:bg-neutral-700 dark:text-gray-200"
      >
        <DropdownMenuItem>
          <div class="px-4 py-2">
            <div class="truncate">{{ authStore.userData?.name }}</div>
            <div class="truncate">@{{ authStore.userData?.username }}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <NuxtLink
            to="/"
            class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            {{ $t('pages.clients') }}
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <NuxtLink
            to="/me"
            class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            {{ $t('pages.me') }}
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="
            authStore.userData &&
            hasPermissions(authStore.userData, 'admin', 'any')
          "
        >
          <NuxtLink
            to="/admin"
            class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            {{ $t('pages.admin.panel') }}
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <button
            class="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            @click.prevent="submit"
          >
            <IconsLogout class="h-5" />
            {{ $t('general.logout') }}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
const toggleState = ref(false);

const _submit = useSubmit(
  '/api/session',
  {
    method: 'delete',
  },
  {
    revert: async () => {
      await navigateTo('/login');
    },
    noSuccessToast: true,
  }
);

function submit() {
  return _submit(undefined);
}

const fallbackName = computed(() => {
  return authStore.userData?.name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
});
</script>
