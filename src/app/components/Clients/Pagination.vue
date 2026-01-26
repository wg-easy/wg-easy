<template>
  <div
    class="mt-4 flex items-center justify-center gap-2"
  >
    <button
      class="btn"
      v-if="clientsStore.page > 1"
      @click="setPage(clientsStore.page - 1)"
    >
      ←
    </button>

    <span class="text-sm text-gray-500">
      {{ clientsStore.page }} / {{ clientsStore.totalPages }}
    </span>

    <button
      class="btn"
      v-if="clientsStore.page < clientsStore.totalPages"
      @click="setPage(clientsStore.page + 1)"
    >
      →
    </button>
  </div>
</template>

<script setup lang="ts">
 const clientsStore = useClientsStore();

 function setPage(p: number) {
   clientsStore.setPageQuery(p);
}
</script>
