import { formatUtcDate } from '#shared/utils/time';
export type {
  TrafficPeriod,
  TrafficReport,
  TrafficReportDay,
} from '#shared/utils/traffic';

export function formatTrafficDateInput(date = new Date()) {
  return formatUtcDate(date);
}

export function getTrafficQuotaUsagePercent(
  totalBytes: number,
  quotaBytes: number | null
) {
  if (quotaBytes === null) {
    return null;
  }

  return Math.min(100, (totalBytes / quotaBytes) * 100);
}
