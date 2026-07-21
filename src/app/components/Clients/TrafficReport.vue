<template>
  <Panel class="mt-4">
    <PanelHead>
      <PanelHeadTitle>
        {{ $t('client.trafficUsage') }}
      </PanelHeadTitle>
    </PanelHead>
    <PanelBody>
      <div class="space-y-6">
        <p class="text-sm text-gray-500 dark:text-neutral-300">
          {{ $t('client.trafficUsageDesc') }}
        </p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FormLabel for="trafficPeriod">
              {{ $t('client.trafficPeriod') }}
            </FormLabel>
            <select
              id="trafficPeriod"
              v-model="period"
              class="w-full rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
            >
              <option
                v-for="option in periodOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <FormLabel for="trafficDate">
              {{ $t('client.trafficDate') }}
            </FormLabel>
            <BaseInput
              id="trafficDate"
              v-model="date"
              class="w-full"
              type="date"
            />
          </div>
        </div>

        <div class="min-h-5 text-sm text-gray-500 dark:text-neutral-300">
          <span v-if="pending && report">
            {{ $t('client.trafficLoading') }}
          </span>
          <span
            v-else-if="error && report"
            class="text-red-800 dark:text-red-300"
          >
            {{ $t('client.trafficLoadError') }}
          </span>
        </div>

        <div
          v-if="pending && !report"
          class="flex min-h-96 items-center text-sm text-gray-500 dark:text-neutral-300"
        >
          {{ $t('client.trafficLoading') }}
        </div>
        <div
          v-else-if="error && !report"
          class="flex min-h-96 items-center text-sm text-red-800 dark:text-red-300"
        >
          {{ $t('client.trafficLoadError') }}
        </div>
        <template v-else-if="report">
          <div class="text-sm text-gray-500 dark:text-neutral-300">
            <span class="font-medium text-gray-700 dark:text-neutral-200">
              {{ $t('client.trafficRange') }}:
            </span>
            {{
              $t('client.trafficRangeValue', {
                start: report.start,
                end: report.endExclusive,
              })
            }}
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="rounded-lg border-2 border-gray-100 p-4 dark:border-neutral-800"
            >
              <div
                class="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400"
              >
                {{ stat.label }}
              </div>
              <div class="mt-1 text-lg font-medium">
                {{ stat.value }}
              </div>
            </div>
          </div>

          <div
            class="rounded-lg border-2 border-gray-100 p-4 dark:border-neutral-800"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div
                  class="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400"
                >
                  {{ $t('client.trafficQuota') }}
                </div>
                <div class="mt-1 text-lg font-medium">
                  {{ quotaLabel }}
                </div>
              </div>

              <span
                v-if="report.exceeded"
                class="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
              >
                {{ $t('client.trafficExceeded') }}
              </span>
            </div>

            <div v-if="quotaUsagePercent !== null" class="mt-4">
              <div class="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  class="h-full rounded-full"
                  :class="report.exceeded ? 'bg-red-800' : 'bg-red-700'"
                  :style="{ width: `${quotaUsagePercent}%` }"
                />
              </div>
              <div class="mt-2 text-sm text-gray-500 dark:text-neutral-300">
                {{ quotaUsagePercentLabel }} {{ $t('client.trafficQuotaUsed') }}
              </div>
            </div>
          </div>

          <div
            class="h-72 overflow-auto rounded-lg border-2 border-gray-100 dark:border-neutral-800"
          >
            <table v-if="report.days.length > 0" class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 dark:border-neutral-800">
                  <th
                    class="sticky top-0 bg-white px-4 py-2 text-left font-medium dark:bg-neutral-700"
                  >
                    {{ $t('client.trafficDate') }}
                  </th>
                  <th
                    class="sticky top-0 bg-white px-4 py-2 text-right font-medium dark:bg-neutral-700"
                  >
                    {{ $t('client.trafficReceived') }}
                  </th>
                  <th
                    class="sticky top-0 bg-white px-4 py-2 text-right font-medium dark:bg-neutral-700"
                  >
                    {{ $t('client.trafficSent') }}
                  </th>
                  <th
                    class="sticky top-0 bg-white px-4 py-2 text-right font-medium dark:bg-neutral-700"
                  >
                    {{ $t('client.trafficTotal') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="day in report.days"
                  :key="day.date"
                  class="border-b border-gray-100 last:border-b-0 dark:border-neutral-800"
                >
                  <td class="px-4 py-2">
                    {{ day.date }}
                  </td>
                  <td class="px-4 py-2 text-right">
                    {{ formatTrafficReportDayBytes(day, 'receivedBytes') }}
                  </td>
                  <td class="px-4 py-2 text-right">
                    {{ formatTrafficReportDayBytes(day, 'sentBytes') }}
                  </td>
                  <td class="py-2 pl-4 text-right">
                    {{ formatTrafficReportDayBytes(day, 'totalBytes') }}
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              v-else
              class="flex h-full items-center px-4 text-sm text-gray-500 dark:text-neutral-300"
            >
              {{ $t('client.trafficNoData') }}
            </div>
          </div>
        </template>
      </div>
    </PanelBody>
  </Panel>
</template>

<script setup lang="ts">
const props = defineProps<{ clientId: number }>();
const { t } = useI18n();

const period = ref<TrafficPeriod>('daily');
const date = ref(formatUtcDate(new Date()));

const periodOptions = computed<Array<{ label: string; value: TrafficPeriod }>>(
  () => [
    { label: t('client.trafficPeriodDaily'), value: 'daily' },
    { label: t('client.trafficPeriodWeekly'), value: 'weekly' },
    { label: t('client.trafficPeriodMonthly'), value: 'monthly' },
  ]
);

const query = computed(() =>
  date.value
    ? { period: period.value, date: date.value }
    : { period: period.value }
);

const {
  data: report,
  error,
  pending,
} = useFetch<TrafficReport>(() => `/api/client/${props.clientId}/traffic`, {
  method: 'get',
  params: query,
  watch: [period, date],
});

const stats = computed(() => {
  if (!report.value) {
    return [];
  }

  return getTrafficReportStats(report.value, t);
});

const quotaLabel = computed(() => {
  if (!report.value) {
    return t('client.trafficUnlimited');
  }

  return getTrafficQuotaLabel(report.value, t('client.trafficUnlimited'));
});

const quotaUsagePercent = computed(() => {
  if (!report.value) {
    return null;
  }

  return getTrafficQuotaUsagePercent(
    report.value.totalBytes,
    report.value.quotaBytes
  );
});

const quotaUsagePercentLabel = computed(() =>
  formatTrafficQuotaUsagePercent(quotaUsagePercent.value)
);
</script>
