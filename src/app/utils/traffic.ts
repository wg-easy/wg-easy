export type TrafficReportStat = {
  label: string;
  value: string;
};

export function formatTrafficBytes(value: number) {
  return bytes(value, 2, true);
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

export function getTrafficReportStats(
  report: TrafficReport,
  translate: (key: string) => string
): TrafficReportStat[] {
  return [
    {
      label: translate('client.trafficReceived'),
      value: formatTrafficBytes(report.receivedBytes),
    },
    {
      label: translate('client.trafficSent'),
      value: formatTrafficBytes(report.sentBytes),
    },
    {
      label: translate('client.trafficTotal'),
      value: formatTrafficBytes(report.totalBytes),
    },
  ];
}

export function getTrafficQuotaLabel(
  report: TrafficReport,
  unlimitedLabel: string
) {
  return report.quotaBytes === null
    ? unlimitedLabel
    : formatTrafficBytes(report.quotaBytes);
}

export function formatTrafficQuotaUsagePercent(value: number | null) {
  return value === null ? '' : `${Math.round(value)}%`;
}

export function formatTrafficReportDayBytes(
  day: TrafficReportDay,
  field: 'receivedBytes' | 'sentBytes' | 'totalBytes'
) {
  return formatTrafficBytes(day[field]);
}
