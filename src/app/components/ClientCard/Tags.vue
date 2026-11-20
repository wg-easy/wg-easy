<template>
  <ul
    v-if="client.tags.length > 0"
    class="mt-2 flex flex-wrap gap-1.5"
    :aria-label="$t('clients.fields.tags.label')"
  >
    <li v-for="tag in client.tags" :key="tag.id">
      <BaseTag>{{ tag.name }}</BaseTag>
    </li>
  </ul>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
