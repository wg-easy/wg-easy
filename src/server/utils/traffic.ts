import { formatUtcDate } from '#shared/utils/time';
import { TRAFFIC_PERIODS, type TrafficPeriod } from '#shared/utils/traffic';

export type TrafficDay = {
  date: string;
  receivedBytes: number;
  sentBytes: number;
};

export type TrafficQuotas = {
  dailyQuota: number | null;
  weeklyQuota: number | null;
  monthlyQuota: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getTrafficPeriodRange(
  period: TrafficPeriod,
  containingDate: Date
) {
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

export function calculateTrafficDelta(previous: number, current: number) {
  return current >= previous ? current - previous : current;
}

export function sumTrafficDays(
  days: TrafficDay[],
  range: { start: string; endExclusive: string }
) {
  return days.reduce(
    (result, day) => {
      if (day.date >= range.start && day.date < range.endExclusive) {
        result.receivedBytes += day.receivedBytes;
        result.sentBytes += day.sentBytes;
      }
      return result;
    },
    { receivedBytes: 0, sentBytes: 0 }
  );
}

export function getExceededTrafficQuotas(
  quotas: TrafficQuotas,
  days: TrafficDay[],
  date: Date
) {
  const quotaField = {
    daily: 'dailyQuota',
    weekly: 'weeklyQuota',
    monthly: 'monthlyQuota',
  } as const satisfies Record<TrafficPeriod, keyof TrafficQuotas>;

  return TRAFFIC_PERIODS.filter((period) => {
    const quota = quotas[quotaField[period]];
    if (quota === null) {
      return false;
    }

    const usage = sumTrafficDays(days, getTrafficPeriodRange(period, date));
    return usage.receivedBytes + usage.sentBytes >= quota;
  });
}
