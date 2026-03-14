<template>
  <PaginationRoot
    :total="clientsStore.total"
    :page="clientsStore.page"
    :itemsPerPage="clientsStore.limit"
    :sibling-count="1"
    show-edges
    @update:page="setPage"
  >
    <PaginationList
      v-slot="{ items }"
      class="mt-4 mb-2 flex items-center gap-1 justify-center"
    >
      <PaginationFirst class="inline-flex items-center text-gray-700 dark:text-neutral-200">
        <IconsChevronDoubleLeft class="w-4 md:mr-2" />
      </PaginationFirst>
      <PaginationPrev class="inline-flex items-center text-gray-700 dark:text-neutral-200">
        <IconsChevronLeft class="w-4 md:mr-2" />
      </PaginationPrev>
      <template v-for="(page, index) in items">
        <PaginationListItem
          v-if="page.type === 'page'"
          :key="index"
          class="inline-flex items-center rounded border-2 border-gray-100 px-4 py-2 text-gray-700 transition hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-neutral-600 dark:text-neutral-200 data-[selected]:border-red-800 data-[selected]:bg-red-800 data-[selected]:text-white"
          :value="page.value"
        >
          {{ page.value }}
        </PaginationListItem>
        <PaginationEllipsis
          v-else
          :key="page.type"
          :index="index"
          class="w-9 h-9 flex items-center justify-center text-gray-700 dark:text-neutral-200"
        >
          &#8230;
        </PaginationEllipsis>
      </template>
      <PaginationNext class="inline-flex items-center text-gray-700 dark:text-neutral-200">
        <IconsChevronRight class="w-4 md:mr-2" />
      </PaginationNext>
      <PaginationLast class="inline-flex items-center text-gray-700 dark:text-neutral-200">
        <IconsChevronDoubleRight class="w-4 md:mr-2" />
      </PaginationLast>
    </PaginationList>
  </PaginationRoot>
</template>

<script setup lang="ts">
import { 
  PaginationEllipsis, 
  PaginationFirst, 
  PaginationLast, 
  PaginationList, 
  PaginationListItem, 
  PaginationNext, 
  PaginationPrev, 
  PaginationRoot } from 'radix-vue'
const clientsStore = useClientsStore();
function setPage(p: number) {
 clientsStore.setPageQuery(p);
}
</script>