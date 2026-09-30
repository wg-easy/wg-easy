<template>
  <div>
    <div class="container mx-auto p-4">
      <div class="flex flex-col gap-4 lg:flex-row">
        <div
          class="overflow-hidden rounded-lg bg-white text-gray-700 shadow-md lg:w-64 dark:bg-neutral-700 dark:text-neutral-200"
        >
          <PanelHead>
            <PanelHeadTitle>
              <NuxtLink to="/admin">
                {{ t('pages.admin.panel') }}
              </NuxtLink>
            </PanelHeadTitle>
          </PanelHead>
          <PanelBody>
            <nav class="flex flex-col gap-2">
              <NuxtLink
                v-for="(item, index) in menuItems"
                :key="index"
                :to="`/admin/${item.id}`"
                class="group rounded"
                active-class="bg-red-800 active"
              >
                <BaseSecondaryButton
                  as="span"
                  class="w-full font-medium group-[.active]:text-white"
                >
                  {{ item.name }}
                </BaseSecondaryButton>
              </NuxtLink>
            </nav>
          </PanelBody>
        </div>

        <div
          class="flex-1 overflow-hidden rounded-lg bg-white text-gray-700 shadow-md dark:bg-neutral-700 dark:text-neutral-200"
        >
          <PanelHead>
            <PanelHeadTitle>
              {{ activeMenuItem.name }}
            </PanelHeadTitle>
          </PanelHead>
          <PanelBody>
            <NuxtPage />
          </PanelBody>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
