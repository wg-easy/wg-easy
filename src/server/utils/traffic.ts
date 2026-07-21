import { formatUtcDate } from '#shared/utils/time';
import {
  TRAFFIC_PERIODS,
  type TrafficPeriod,
  type TrafficReport,
} from '#shared/utils/traffic';

export type TrafficPeriodRange = {
  start: string;
  endExclusive: string;
};

export type TrafficDay = {
  date: string;
  receivedBytes: number;
  sentBytes: number;
};

export type TrafficTotals = {
  receivedBytes: number;
  sentBytes: number;
  totalBytes: number;
};

export type TrafficQuotas = {
  dailyQuota: number | null;
  weeklyQuota: number | null;
  monthlyQuota: number | null;
};

export const TRAFFIC_QUOTA_FIELD = {
  daily: 'dailyQuota',
  weekly: 'weeklyQuota',
  monthly: 'monthlyQuota',
} as const satisfies Record<TrafficPeriod, keyof TrafficQuotas>;

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateTrafficDelta(previous: number, current: number) {
  return current >= previous ? current - previous : current;
}

export function getTrafficPeriodRange(
  period: TrafficPeriod,
  containingDate: Date
): TrafficPeriodRange {
  const year = containingDate.getUTCFullYear();
  const month = containingDate.getUTCMonth();
  const day = containingDate.getUTCDate();
  let start: Date;
  let endExclusive: Date;

  if (period === 'daily') {
    start = new Date(Date.UTC(year, month, day));
    endExclusive = new Date(start.getTime() + DAY_MS);
  } else if (period === 'weekly') {
    const midnight = new Date(Date.UTC(year, month, day));
    const daysSinceMonday = (midnight.getUTCDay() + 6) % 7;
    start = new Date(midnight.getTime() - daysSinceMonday * DAY_MS);
    endExclusive = new Date(start.getTime() + 7 * DAY_MS);
  } else {
    start = new Date(Date.UTC(year, month, 1));
    endExclusive = new Date(Date.UTC(year, month + 1, 1));
  }

  return {
    start: formatUtcDate(start),
    endExclusive: formatUtcDate(endExclusive),
  };
}

function getTrafficPeriodRanges(containingDate: Date) {
  return {
    daily: getTrafficPeriodRange('daily', containingDate),
    weekly: getTrafficPeriodRange('weekly', containingDate),
    monthly: getTrafficPeriodRange('monthly', containingDate),
  } as const satisfies Record<TrafficPeriod, TrafficPeriodRange>;
}

export function getTrafficQuotaEvaluationRange(containingDate: Date) {
  const ranges = Object.values(getTrafficPeriodRanges(containingDate));
  const start = ranges.map((range) => range.start).sort()[0]!;
  const endExclusive = ranges
    .map((range) => range.endExclusive)
    .sort()
    .at(-1)!;

  return { start, endExclusive };
}

export function getTrafficQuotaField(period: TrafficPeriod) {
  return TRAFFIC_QUOTA_FIELD[period];
}

export function getTrafficQuotaBytes(
  quotas: TrafficQuotas,
  period: TrafficPeriod
) {
  return quotas[getTrafficQuotaField(period)];
}

export function getTrafficTotalBytes(
  traffic: Pick<TrafficDay, 'receivedBytes' | 'sentBytes'>
) {
  return traffic.receivedBytes + traffic.sentBytes;
}

export function sumTrafficDays(
  days: TrafficDay[],
  range: TrafficPeriodRange
): TrafficTotals {
  return days.reduce(
    (result, day) => {
      if (day.date >= range.start && day.date < range.endExclusive) {
        result.receivedBytes += day.receivedBytes;
        result.sentBytes += day.sentBytes;
        result.totalBytes += getTrafficTotalBytes(day);
      }
      return result;
    },
    { receivedBytes: 0, sentBytes: 0, totalBytes: 0 }
  );
}

export function getExceededTrafficQuotas(
  quotas: TrafficQuotas,
  days: TrafficDay[],
  date: Date
) {
  return TRAFFIC_PERIODS.filter((period) => {
    const quota = getTrafficQuotaBytes(quotas, period);
    if (quota === null) {
      return false;
    }

    const usage = sumTrafficDays(days, getTrafficPeriodRange(period, date));
    return usage.totalBytes >= quota;
  });
}

export function buildTrafficReport({
  period,
  range,
  quotaBytes,
  days,
}: {
  period: TrafficPeriod;
  range: TrafficPeriodRange;
  quotaBytes: number | null;
  days: TrafficDay[];
}): TrafficReport {
  const reportDays = days
    .filter((day) => day.date >= range.start && day.date < range.endExclusive)
    .map((day) => ({
      ...day,
      totalBytes: getTrafficTotalBytes(day),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const usage = sumTrafficDays(reportDays, range);

  return {
    period,
    start: range.start,
    endExclusive: range.endExclusive,
    quotaBytes,
    receivedBytes: usage.receivedBytes,
    sentBytes: usage.sentBytes,
    totalBytes: usage.totalBytes,
    exceeded: quotaBytes !== null && usage.totalBytes >= quotaBytes,
    days: reportDays,
  };
}
