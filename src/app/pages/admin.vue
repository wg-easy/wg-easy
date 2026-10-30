<template>
  <main class="page-container">
    <div class="mb-7">
      <p class="eyebrow mb-3">WireGuard / {{ $t('admin.title') }}</p>
      <h1 id="admin-section-title" class="page-title">
        {{ activeMenuItem.name }}
      </h1>
      <p class="mt-3 text-sm text-subtle">{{ $t('admin.description') }}</p>
    </div>
    <div class="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="surface p-3 lg:sticky lg:top-6">
        <nav
          class="flex flex-wrap gap-1 lg:flex-col"
          :aria-label="$t('admin.title')"
        >
          <NuxtLink
            to="/admin"
            class="nav-link"
            exact-active-class="bg-accent/10 text-accent"
          >
            {{ $t('admin.overview') }}
          </NuxtLink>
          <NuxtLink
            v-for="item in menuItems"
            :key="item.id"
            :to="`/admin/${item.id}`"
            class="nav-link"
            active-class="bg-accent/10 text-accent"
          >
            {{ item.name }}
          </NuxtLink>
        </nav>
      </aside>
      <section aria-labelledby="admin-section-title" class="min-w-0">
        <NuxtPage />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
const { t } = useI18n();

const route = useRoute();

const menuItems = computed(() => [
  { id: 'general', name: t('admin.general.title') },
  { id: 'config', name: t('admin.config.title') },
  { id: 'interface', name: t('admin.interface.title') },
  { id: 'hooks', name: t('admin.hooks.title') },
]);

const activeMenuItem = computed(() => {
  return (
    menuItems.value.find((item) => route.path === `/admin/${item.id}`) ?? {
      id: '',
      name: t('admin.overview'),
    }
  );
});
</script>
