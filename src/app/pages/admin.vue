<template>
  <div>
    <div class="container mx-auto p-4">
      <div class="flex">
        <div class="w-64 bg-white dark:bg-neutral-700 rounded-lg p-4 mr-4">
          <NuxtLink to="/admin">
            <h2 class="text-xl font-bold dark:text-neutral-200 mb-4">
              Admin Panel
            </h2>
          </NuxtLink>
          <div class="space-y-2 flex flex-col">
            <NuxtLink
              v-for="(item, index) in menuItems"
              :key="index"
              :to="`/admin/${item.id}`"
            >
              <BaseButton
                class="font-medium dark:text-neutral-200 p-2 rounded cursor-pointer hover:bg-red-800 transition-colors duration-200 w-full"
              >
                {{ item.name }}
              </BaseButton>
            </NuxtLink>
          </div>
        </div>

        <div
          class="flex-1 bg-white dark:text-neutral-200 dark:bg-neutral-700 rounded-lg p-6"
        >
          <h1 class="text-3xl font-bold mb-6">{{ activeMenuItem?.name }}</h1>
          <NuxtPage />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();

const route = useRoute();

const menuItems = [
  { id: 'features', name: 'Features' },
  { id: 'user', name: 'User' },
  { id: 'server', name: 'Server' },
];

const activeMenuItem = computed(() => {
  return menuItems.find((item) => route.path === `/admin/${item.id}`);
});
</script>
