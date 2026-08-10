<template>
  <select
    v-if="groups && groups.length > 0"
    v-model="selected"
    :aria-label="$t('client.filterByGroup')"
    class="h-8 rounded bg-gray-200 px-3 text-sm leading-none dark:bg-neutral-500 dark:text-neutral-200"
    @change="onChange"
  >
    <option :value="null">{{ $t('client.allGroups') }}</option>
    <option v-for="group in groups" :key="group.id" :value="group.id">
      {{ group.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();
const { data: groups } = await useFetch('/api/group', { method: 'get' });

const selected = ref<number | null>(null);

function onChange() {
  clientsStore.setGroupFilter(selected.value ?? undefined);
  clientsStore.refresh().catch(console.error);
}
</script>
