<template>
  <div class="min-h-screen">
    <div class="container mx-auto p-4">
      <div class="flex">
        <!-- Sidebar -->
        <div class="w-64 bg-white dark:bg-neutral-700 rounded-lg p-4 mr-4">
          <h2 class="text-xl font-bold dark:text-neutral-200 mb-4">
            Admin Panel
          </h2>
          <ul class="space-y-2">
            <li
              v-for="(item, index) in menuItems"
              :key="index"
              :class="{ 'bg-gray-700': activeMenuItem?.id === item.id }"
              class="font-medium dark:text-neutral-200 p-2 rounded cursor-pointer hover:bg-red-800 transition-colors duration-200"
              @click="router.push(`/admin/${item.id}`)"
            >
              {{ item.name }}
            </li>
          </ul>
        </div>

        <!-- Main Content -->
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

const router = useRouter();
const route = useRoute();

const menuItems = [
  { id: 'user', name: 'User' },
  { id: 'clients', name: 'Clients' },
  { id: 'server', name: 'Server' },
];

const activeMenuItem = computed(() => {
  return menuItems.find((item) => route.path === `/admin/${item.id}`);
});
</script>
