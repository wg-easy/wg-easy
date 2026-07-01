export const TRAFFIC_PERIODS = ['daily', 'weekly', 'monthly'] as const;

export type TrafficPeriod = (typeof TRAFFIC_PERIODS)[number];

export type TrafficReportDay = {
  date: string;
  receivedBytes: number;
  sentBytes: number;
  totalBytes: number;
};

export type TrafficReport = {
  period: TrafficPeriod;
  start: string;
  endExclusive: string;
  quotaBytes: number | null;
  receivedBytes: number;
  sentBytes: number;
  totalBytes: number;
  exceeded: boolean;
  days: TrafficReportDay[];
};
