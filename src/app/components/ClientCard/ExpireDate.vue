<template>
  <div class="block text-xs text-gray-500 dark:text-neutral-400">
    <span class="inline-block">{{ expiredDateFormat(client.expiresAt) }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ client: LocalClient }>();

const { t, locale } = useI18n();

function expiredDateFormat(value: string | null) {
  if (value === null) return t('client.permanent');
  const dateTime = new Date(value);
  return dateTime.toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>
