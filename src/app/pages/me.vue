<template>
  <main>
    <div class="container mx-auto max-w-3xl px-3 md:px-0">
      <div
        class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden"
      >
        <div
          class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600"
        >
          <div class="flex-grow">
            <p class="text-2xl font-medium dark:text-neutral-200">Account</p>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-[15px] px-5">
            <Label class="font-semibold dark:text-neutral-200" for="username">
              Username
            </Label>
            <input id="username" v-model.trim="username" type="text" />
          </div>
          <div class="flex flex-wrap items-center gap-[15px] px-5">
            <Label class="font-semibold dark:text-neutral-200" for="name">
              Name
            </Label>
            <input id="name" v-model.trim="name" type="text" />
          </div>
          <div class="flex flex-wrap items-center gap-[15px] px-5">
            <Label class="font-semibold dark:text-neutral-200" for="name">
              E-Mail
            </Label>
            <input id="name" v-model.trim="email" type="text" />
          </div>
          <BaseButton class="self-end" @click="openPasswordModal">
            Change Password
          </BaseButton>
          <BaseButton class="self-end" @click="submit">Save</BaseButton>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();

const username = ref(authStore.userData?.username);
const name = ref(authStore.userData?.name);
const email = ref(authStore.userData?.email);

function submit() {}

function openPasswordModal() {}
</script>
