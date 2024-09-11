<template>
  <div class="space-y-6">
    <div class="flex items-center space-x-4">
      <img src="/logo.png" alt="User Avatar" class="w-20 h-20 rounded-full" />
      <div>
        <h3 class="text-xl font-semibold">John Doe</h3>
        <p class="text-gray-400">john.doe@example.com</p>
      </div>
    </div>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Username</label>
        <input
          v-model="username"
          type="text"
          class="w-full bg-gray-800 rounded p-2 text-white"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input
          v-model="email"
          type="email"
          class="w-full bg-gray-800 rounded p-2 text-white"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const username = ref();
const email = ref();
</script>
