<template>
  <main class="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-12 sm:py-16">
    <HeaderInsecure />
    <div class="surface p-7 shadow-xl sm:p-9">
      <div class="mb-7">
        <img src="/logo.png" alt="" class="mb-6 size-10" />
        <p class="eyebrow mb-3">WireGuard Easy</p>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ $t(isTwoFactor ? 'general.2fa' : 'ui.welcomeBack') }}
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-subtle">
          {{ $t(isTwoFactor ? 'me.2faCodeDesc' : 'ui.signInDescription') }}
        </p>
      </div>
      <NuxtPage />
    </div>
  </main>
</template>

<script setup lang="ts">
const route = useRoute();
const isTwoFactor = computed(() => route.path === '/login/2fa');
</script>
