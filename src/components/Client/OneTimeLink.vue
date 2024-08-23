<template>
  <div
    v-if="
      enableOneTimeLinks &&
      client.oneTimeLink !== null &&
      client.oneTimeLink !== ''
    "
    :ref="'client-' + client.id + '-link'"
    class="text-gray-400 text-xs"
  >
    <a :href="'./cnf/' + client.oneTimeLink + ''"
      >{{ document.location.protocol }}//{{ document.location.host }}/cnf/{{
        client.oneTimeLink
      }}</a
    >
  </div>
</template>

<script setup lang="ts">
defineProps<{ client: LocalClient }>();
</script>
