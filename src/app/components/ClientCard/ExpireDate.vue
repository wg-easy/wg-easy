<template>
  <div class="text-[11px] text-subtle">
    <NuxtTime
      v-if="client.expiresAt"
      class="inline-block"
      :datetime="client.expiresAt"
      :locale="locale"
      year="numeric"
      month="long"
      day="numeric"
      hour="2-digit"
      minute="2-digit"
    />
    <span v-else class="inline-block">{{ $t('client.permanent') }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ client: LocalClient }>();

const { locale } = useI18n();
</script>
