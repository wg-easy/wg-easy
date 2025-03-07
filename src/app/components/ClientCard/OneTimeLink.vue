<template>
  <div v-if="modifiedOtls.length > 0" class="text-xs text-gray-400">
    <div v-for="link in modifiedOtls" :key="link.oneTimeLink">
      <a :href="'./cnf/' + link.oneTimeLink">{{ link.path ?? 'Loading' }}</a>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();

const modifiedOtls = ref<
  (LocalClient['oneTimeLinks'][number] & { path?: string })[]
>(props.client.oneTimeLinks);

const timer = ref<NodeJS.Timeout | null>(null);

const { localeProperties } = useI18n();

onMounted(() => {
  timer.value = setIntervalImmediately(() => {
    for (const link of modifiedOtls.value) {
      const timeLeft = new Date(link.expiresAt).getTime() - Date.now();

      if (timeLeft <= 0) {
        link.path = `${document.location.protocol}//${document.location.host}/cnf/${link.oneTimeLink} (00:00)`;
        continue;
      }

      const formatter = new Intl.DateTimeFormat(
        localeProperties.value.language,
        {
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        }
      );

      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);

      const date = new Date(0);
      date.setMinutes(minutes);
      date.setSeconds(seconds);

      link.path = `${document.location.protocol}//${document.location.host}/cnf/${link.oneTimeLink} (${formatter.format(date)})`;
    }
  }, 1000);
});

onUnmounted(() => {
  if (timer.value) {
    clearTimeout(timer.value);
  }
});
</script>
