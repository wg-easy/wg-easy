<template>
  <main>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-gray-500 dark:text-neutral-300">
        {{ $t('quota.pageDescription') }}
      </p>
      <QuotaFormDialog :clients="clients ?? []" @saved="refreshAll">
        <template #trigger>
          <BasePrimaryButton class="gap-2">
            <IconsPlus class="size-4" />
            {{ $t('quota.create') }}
          </BasePrimaryButton>
        </template>
      </QuotaFormDialog>
    </div>

    <div
      v-if="quotas?.length"
      class="divide-y divide-gray-100 border-y border-gray-100 dark:divide-neutral-600 dark:border-neutral-600"
    >
      <article
        v-for="quota in quotas"
        :id="`quota-${quota.id}`"
        :key="quota.id"
        class="scroll-mt-4 py-4"
      >
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate font-medium text-gray-900 dark:text-white">
                {{ quota.name }}
              </h2>
              <span
                class="rounded px-2 py-0.5 text-xs font-medium"
                :class="statusClass(quota)"
              >
                {{ statusLabel(quota) }}
              </span>
              <span class="text-xs text-gray-400">
                {{ $t(`quota.modes.${quota.limit.mode}`) }}
              </span>
            </div>

            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div v-for="usage in usageRows(quota)" :key="usage.label">
                <div class="mb-1 flex justify-between gap-3 text-xs">
                  <span class="text-gray-500 dark:text-neutral-400">{{
                    usage.label
                  }}</span>
                  <span
                    class="tabular-nums text-gray-700 dark:text-neutral-200"
                  >
                    {{ bytes(usage.used) }} / {{ bytes(usage.limit) }}
                  </span>
                </div>
                <div
                  class="h-1.5 overflow-hidden rounded bg-gray-100 dark:bg-neutral-600"
                >
                  <div
                    class="h-full rounded transition-[width]"
                    :class="
                      usage.used >= usage.limit
                        ? 'bg-red-700'
                        : 'bg-emerald-600'
                    "
                    :style="{
                      width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                    }"
                  />
                </div>
              </div>
            </div>

            <div
              class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-neutral-400"
            >
              <span>{{
                $t('quota.clientCount', { count: quota.clientCount })
              }}</span>
              <span>{{ resetLabel(quota) }}</span>
              <span v-if="quota.nextResetAt">
                {{
                  $t('quota.nextReset', { date: formatDate(quota.nextResetAt) })
                }}
              </span>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-end gap-1">
            <QuotaFormDialog
              :quota="quota"
              :clients="clients ?? []"
              @saved="refreshAll"
            >
              <template #trigger>
                <button
                  type="button"
                  class="rounded bg-gray-100 p-2 text-gray-500 transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300"
                  :aria-label="$t('quota.edit')"
                  :title="$t('quota.edit')"
                >
                  <IconsEdit class="size-5" />
                </button>
              </template>
            </QuotaFormDialog>

            <BaseDialog>
              <template #trigger>
                <button
                  type="button"
                  class="rounded bg-gray-100 p-2 text-gray-500 transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300"
                  :aria-label="$t('quota.resetUsage')"
                  :title="$t('quota.resetUsage')"
                >
                  <ArrowPathIcon class="size-5" />
                </button>
              </template>
              <template #title>{{ $t('quota.resetUsage') }}</template>
              <template #description>
                {{ $t('quota.resetConfirm', { name: quota.name }) }}
              </template>
              <template #actions>
                <DialogClose as-child>
                  <BaseSecondaryButton>{{
                    $t('dialog.cancel')
                  }}</BaseSecondaryButton>
                </DialogClose>
                <DialogClose as-child>
                  <BasePrimaryButton @click="resetQuota(quota.id)">
                    {{ $t('quota.resetUsage') }}
                  </BasePrimaryButton>
                </DialogClose>
              </template>
            </BaseDialog>

            <BaseDialog>
              <template #trigger>
                <button
                  type="button"
                  class="rounded bg-gray-100 p-2 text-gray-500 transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300"
                  :aria-label="$t('quota.delete')"
                  :title="$t('quota.delete')"
                >
                  <IconsDelete class="size-5" />
                </button>
              </template>
              <template #title>{{ $t('quota.delete') }}</template>
              <template #description>
                {{ $t('quota.deleteConfirm', { name: quota.name }) }}
              </template>
              <template #actions>
                <DialogClose as-child>
                  <BaseSecondaryButton>{{
                    $t('dialog.cancel')
                  }}</BaseSecondaryButton>
                </DialogClose>
                <DialogClose as-child>
                  <BasePrimaryButton @click="deleteQuota(quota.id)">
                    {{ $t('quota.delete') }}
                  </BasePrimaryButton>
                </DialogClose>
              </template>
            </BaseDialog>
          </div>
        </div>
      </article>
    </div>

    <div
      v-else
      class="py-12 text-center text-sm text-gray-500 dark:text-neutral-400"
    >
      {{ $t('quota.empty') }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/outline';

import type { QuotaPublic } from '#db/repositories/quota/types';

const { t, locale } = useI18n();
const { data: quotas, refresh: refreshQuotas } = await useFetch(
  '/api/admin/quotas',
  {
    method: 'get',
  }
);
const { data: clients, refresh: refreshClients } = await useFetch(
  '/api/client',
  {
    method: 'get',
  }
);

type UsageRow = { label: string; used: number; limit: number };

function usageRows(quota: QuotaPublic): UsageRow[] {
  switch (quota.limit.mode) {
    case 'RX':
      return [
        {
          label: t('quota.rx'),
          used: quota.usedRxBytes,
          limit: quota.limit.rxBytes,
        },
      ];
    case 'TX':
      return [
        {
          label: t('quota.tx'),
          used: quota.usedTxBytes,
          limit: quota.limit.txBytes,
        },
      ];
    case 'TOTAL':
      return [
        {
          label: t('quota.total'),
          used: quota.usedRxBytes + quota.usedTxBytes,
          limit: quota.limit.totalBytes,
        },
      ];
    case 'SEPARATE':
      return [
        {
          label: t('quota.rx'),
          used: quota.usedRxBytes,
          limit: quota.limit.rxBytes,
        },
        {
          label: t('quota.tx'),
          used: quota.usedTxBytes,
          limit: quota.limit.txBytes,
        },
      ];
  }
}

function statusLabel(quota: QuotaPublic) {
  if (!quota.enabled) return t('quota.status.disabled');
  if (quota.exceededAt) return t('quota.status.exceeded');
  return t('quota.status.active');
}

function statusClass(quota: QuotaPublic) {
  if (!quota.enabled)
    return 'bg-gray-100 text-gray-600 dark:bg-neutral-600 dark:text-neutral-300';
  if (quota.exceededAt)
    return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function resetLabel(quota: QuotaPublic) {
  if (quota.reset.frequency === 'NONE') return t('quota.noReset');
  return t('quota.resetSchedule', {
    frequency: t(`quota.frequencies.${quota.reset.frequency}`),
    timezone: quota.reset.timezone,
  });
}

async function refreshAll() {
  await Promise.all([refreshQuotas(), refreshClients()]);
}

const submitReset = useSubmit(
  (body) =>
    $fetch(`/api/admin/quotas/${Number(body?.quotaId)}/reset`, {
      method: 'post',
    }),
  {
    successMsg: t('quota.resetSuccess'),
    revert: async (success) => {
      if (success) await refreshAll();
    },
  }
);

const submitDelete = useSubmit(
  (body) =>
    $fetch(`/api/admin/quotas/${Number(body?.quotaId)}`, { method: 'delete' }),
  {
    successMsg: t('quota.deleted'),
    revert: async (success) => {
      if (success) await refreshAll();
    },
  }
);

function resetQuota(quotaId: number) {
  return submitReset({ quotaId });
}

function deleteQuota(quotaId: number) {
  return submitDelete({ quotaId });
}
</script>
