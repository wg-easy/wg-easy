<template>
  <div>
    <div class="container mx-auto p-4">
      <div class="flex flex-col gap-4 lg:flex-row">
        <div class="rounded-lg bg-white p-4 lg:w-64 dark:bg-neutral-700">
          <NuxtLink to="/admin">
            <h2 class="mb-4 text-xl font-bold dark:text-neutral-200">
              {{ t('pages.admin.panel') }}
            </h2>
          </NuxtLink>
          <div class="flex flex-col space-y-2">
            <NuxtLink
              v-for="(item, index) in menuItems"
              :key="index"
              :to="`/admin/${item.id}`"
              active-class="bg-red-800 rounded"
            >
              <BaseSecondaryButton
                as="span"
                class="w-full cursor-pointer rounded p-2 font-medium transition-colors duration-200 hover:bg-red-800 dark:text-neutral-200"
              >
                {{ item.name }}
              </BaseSecondaryButton>
            </NuxtLink>
          </div>
        </div>

        <div
          class="flex-1 rounded-lg bg-white p-6 dark:bg-neutral-700 dark:text-neutral-200"
        >
          <h1 class="mb-6 text-3xl font-bold">{{ activeMenuItem.name }}</h1>
          <NuxtPage />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();

const { t } = useI18n();

const route = useRoute();

const menuItems = computed(() => [
  { id: 'general', name: t('pages.admin.general') },
  { id: 'config', name: t('pages.admin.config') },
  { id: 'interface', name: t('pages.admin.interface') },
  { id: 'hooks', name: t('pages.admin.hooks') },
]);

const defaultItem = { id: '', name: t('pages.admin.panel') };

const activeMenuItem = computed(() => {
  return (
    menuItems.value.find((item) => route.path === `/admin/${item.id}`) ??
    defaultItem
  );
});
</script>
