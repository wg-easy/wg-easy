<template>
  <div v-if="client.oneTimeLink !== null" class="text-xs text-gray-400">
    <a :href="'./cnf/' + client.oneTimeLink.oneTimeLink">{{ path }}</a>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();

const path = computed(() => {
  if (import.meta.client) {
    // TODO: show how long its still valid
    return `${document.location.protocol}//${document.location.host}/cnf/${props.client.oneTimeLink?.oneTimeLink}`;
  }
  return 'Loading...';
});
</script>
