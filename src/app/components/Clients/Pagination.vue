<template>
  <PaginationRoot
    v-slot="{ page, pageCount }"
    :page="clientsStore.pagination.page"
    :items-per-page="clientsStore.pagination.pageSize"
    :total="clientsStore.pagination.total"
    :disabled="clientsStore.isUpdatingList"
    :aria-label="$t('ui.clientPagination')"
    class="mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-line pt-4"
    @update:page="clientsStore.setPage"
  >
    <p class="text-xs text-subtle tabular-nums" role="status">
      {{
        $t('ui.clientRange', {
          start:
            clientsStore.pagination.total === 0
              ? 0
              : (clientsStore.pagination.page - 1) *
                  clientsStore.pagination.pageSize +
                1,
          end: Math.min(
            clientsStore.pagination.page * clientsStore.pagination.pageSize,
            clientsStore.pagination.total
          ),
          total: clientsStore.pagination.total,
        })
      }}
    </p>
    <div
      class="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:gap-5"
    >
      <div class="flex items-center gap-2">
        <RLabel :for="pageSizeId" class="text-xs text-subtle">
          {{ $t('ui.perPage') }}
        </RLabel>
        <BaseSelect
          :id="pageSizeId"
          v-model="selectedPageSize"
          :label="$t('ui.perPage')"
          :options="pageSizeOptions"
          :show-value="false"
          compact
        />
      </div>
      <div class="flex items-center gap-1">
        <PaginationPrev
          class="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-raised disabled:opacity-30 disabled:hover:bg-transparent"
          :aria-label="$t('ui.previousPage')"
          :title="$t('ui.previousPage')"
        >
          <ChevronLeftIcon class="size-4" aria-hidden="true" />
        </PaginationPrev>
        <span class="px-2 text-xs text-muted tabular-nums">
          {{
            $t('ui.pageOf', {
              page,
              total: pageCount,
            })
          }}
        </span>
        <PaginationNext
          class="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-raised disabled:opacity-30 disabled:hover:bg-transparent"
          :aria-label="$t('ui.nextPage')"
          :title="$t('ui.nextPage')"
        >
          <ChevronRightIcon class="size-4" aria-hidden="true" />
        </PaginationNext>
      </div>
    </div>
  </PaginationRoot>
</template>

<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue';
import { Label as RLabel } from 'reka-ui';
import { useId } from 'vue';

const clientsStore = useClientsStore();
const pageSizeId = useId();
const pageSizeOptions = [10, 25, 50, 100].map((value) => ({
  value,
  label: String(value),
}));
const selectedPageSize = computed({
  get: () => clientsStore.query.pageSize,
  set: (value: number) => clientsStore.updateQuery({ pageSize: value }),
});
</script>
