<template>
  <div
    v-if="
      globalStore.features.oneTimeLinks.enabled && client.oneTimeLink !== null
    "
    :ref="'client-' + client.id + '-link'"
    class="text-gray-400 text-xs"
  >
    <a :href="'./cnf/' + client.oneTimeLink + ''">{{ path }}</a>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();

const globalStore = useGlobalStore();

const path = computed(() => {
  if (import.meta.client) {
    return `${document.location.protocol}//${document.location.host}/cnf/${props.client.oneTimeLink}`;
  }
  return '';
});
</script>
