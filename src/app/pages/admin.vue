<template>
  <div>
    <div class="container mx-auto p-4">
      <div class="flex">
        <div class="mr-4 w-64 rounded-lg bg-white p-4 dark:bg-neutral-700">
          <NuxtLink to="/admin">
            <h2 class="mb-4 text-xl font-bold dark:text-neutral-200">
              Admin Panel
            </h2>
          </NuxtLink>
          <div class="flex flex-col space-y-2">
            <NuxtLink
              v-for="(item, index) in menuItems"
              :key="index"
              :to="`/admin/${item.id}`"
            >
              <BaseButton
                class="w-full cursor-pointer rounded p-2 font-medium transition-colors duration-200 hover:bg-red-800 dark:text-neutral-200"
              >
                {{ item.name }}
              </BaseButton>
            </NuxtLink>
          </div>
        </div>

        <div
          class="flex-1 rounded-lg bg-white p-6 dark:bg-neutral-700 dark:text-neutral-200"
        >
          <h1 class="mb-6 text-3xl font-bold">{{ activeMenuItem?.name }}</h1>
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
  { id: '', name: 'General' },
  { id: 'defaults', name: 'Defaults' },
  { id: 'interface', name: 'Interface' },
  { id: 'metrics', name: 'Metrics' },
];

const activeMenuItem = computed(() => {
  return menuItems.find((item) => route.path === `/admin/${item.id}`);
});
</script>
