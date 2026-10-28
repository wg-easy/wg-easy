<template>
  <div class="flex flex-col gap-3" :aria-busy="clientsStore.isUpdatingList">
    <ClientCard
      v-for="client in clientsStore.clients"
      :key="client.id"
      :client="client"
      :selected="selectable && clientsStore.selectedIds.includes(client.id)"
    >
      <template v-if="selectable" #selection>
        <BaseCheckbox
          class="mt-2"
          :model-value="clientsStore.selectedIds.includes(client.id)"
          :label="$t('clients.bulk.selectClient', { name: client.name })"
          :disabled="clientsStore.isUpdatingList || clientsStore.isApplyingBulk"
          @update:model-value="
            clientsStore.selectClient(client.id, $event === true)
          "
        />
      </template>
    </ClientCard>
  </div>
</template>

<script setup lang="ts">
defineProps<{ selectable?: boolean }>();
const clientsStore = useClientsStore();
</script>
