<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle :text="$t('pages.me')" />
      </PanelHead>
      <PanelBody class="dark:text-neutral-200">
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h4 class="text-2xl col-span-full py-6">
            {{ $t('me.sectionGeneral') }}
          </h4>
          <Label
            for="username"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ $t('username') }}
          </Label>
          <input
            id="username"
            v-model.trim="username"
            type="text"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <Label for="name" class="font-semibold md:align-middle md:leading-10">
            {{ $t('name') }}
          </Label>
          <input
            id="name"
            v-model.trim="name"
            type="text"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <Label
            for="email"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ $t('email') }}
          </Label>
          <input
            id="email"
            v-model.trim="email"
            type="email"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <div class="col-span-full">
            <BaseButton @click="submit">{{ $t('save') }}</BaseButton>
          </div>
        </section>
        <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h4 class="text-2xl col-span-full py-6">
            {{ $t('me.sectionPassword') }}
          </h4>
          <Label
            for="current-password"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ $t('currentPassword') }}
          </Label>
          <input
            id="current-password"
            v-model.trim="currentPassword"
            type="password"
            autocomplete="current-password"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <Label
            for="new-password"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ $t('setup.newPassword') }}
          </Label>
          <input
            id="new-password"
            v-model.trim="newPassword"
            type="password"
            autocomplete="new-password"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <Label
            for="confirm-password"
            class="font-semibold md:align-middle md:leading-10"
          >
            {{ $t('confirmPassword') }}
          </Label>
          <input
            id="confirm-password"
            v-model.trim="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
          />
          <div class="col-span-full">
            <BaseButton @click="updatePassword">{{
              $t('updatePassword')
            }}</BaseButton>
          </div>
        </section>
      </PanelBody>
    </Panel>
  </main>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();

const username = ref(authStore.userData?.username);
const name = ref(authStore.userData?.name);
const email = ref(authStore.userData?.email);

// TODO: handle update password

const currentPassword = ref(authStore.userData?.email);
const newPassword = ref(authStore.userData?.email);
const confirmPassword = ref(authStore.userData?.email);

function submit() {}

function updatePassword() {}
</script>
