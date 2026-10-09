<template>
  <DropdownMenuRoot v-model:open="toggleState">
    <DropdownMenuTrigger
      class="header-control gap-2 rounded-full pr-1 pl-1 sm:pr-3"
      :aria-label="$t('pages.me')"
    >
      <BaseAvatar
        class="size-8 rounded-full bg-surface-hover text-foreground"
        >{{ fallbackName }}</BaseAvatar
      >
      <span class="hidden max-w-24 truncate xl:inline">{{
        authStore.userData?.name
      }}</span
      ><IconsArrowDown class="hidden size-3 sm:block" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent :side-offset="8" align="end" class="ui-menu w-56">
        <DropdownMenuLabel class="mb-1 border-b border-line px-3 py-3"
          ><span class="block truncate font-medium text-foreground">{{
            authStore.userData?.name
          }}</span
          ><span class="block truncate text-xs text-subtle"
            >@{{ authStore.userData?.username }}</span
          ></DropdownMenuLabel
        >
        <DropdownMenuItem as-child
          ><NuxtLink to="/" class="ui-menu-item">{{
            $t('pages.clients')
          }}</NuxtLink></DropdownMenuItem
        >
        <DropdownMenuItem as-child
          ><NuxtLink to="/me" class="ui-menu-item">{{
            $t('pages.me')
          }}</NuxtLink></DropdownMenuItem
        >
        <DropdownMenuItem
          v-if="
            authStore.userData &&
            hasPermissions(authStore.userData, 'admin', 'any')
          "
          as-child
          ><NuxtLink to="/admin" class="ui-menu-item">{{
            $t('pages.admin.panel')
          }}</NuxtLink></DropdownMenuItem
        >
        <DropdownMenuSeparator class="my-1 h-px bg-line" />
        <DropdownMenuItem class="ui-menu-item text-accent" @select="submit"
          ><IconsLogout class="size-4" />{{
            $t('general.logout')
          }}</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
const toggleState = ref(false);

const _submit = useSubmit(
  (data) =>
    $fetch('/api/session', {
      method: 'delete',
      body: data,
    }),
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
