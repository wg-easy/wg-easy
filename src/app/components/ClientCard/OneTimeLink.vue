<template>
  <div
    v-if="client.oneTimeLink !== null"
    :ref="'client-' + client.id + '-link'"
    class="text-xs text-gray-400"
  >
    <a :href="'./cnf/' + client.oneTimeLink + ''">{{ path }}</a>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();

const path = computed(() => {
  if (import.meta.client) {
    return `${document.location.protocol}//${document.location.host}/cnf/${props.client.oneTimeLink}`;
  }
  return '';
});
</script>
