<template>
  <div
    v-show="globalStore.features.clientExpiration.enabled"
    class="block md:inline-block pb-1 md:pb-0 text-gray-500 dark:text-neutral-400 text-xs"
  >
    <span class="inline-block">{{ expiredDateFormat(client.expiresAt) }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ client: LocalClient }>();

const globalStore = useGlobalStore();
const { t, locale } = useI18n();

function expiredDateFormat(value: string | null) {
  if (value === null) return t('Permanent');
  const dateTime = new Date(value);
  return dateTime.toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>
