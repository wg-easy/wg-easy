import z from 'zod';

import { TRAFFIC_PERIODS, parseUtcDate } from '#server/utils/traffic';

export const TrafficQuerySchema = z.object({
  period: z.enum(TRAFFIC_PERIODS),
  date: z
    .string()
    .refine((value) => parseUtcDate(value) !== null, 'Invalid UTC date')
    .optional(),
});

export type TrafficQueryType = z.infer<typeof TrafficQuerySchema>;

export type TrafficPeer = {
  publicKey: string;
  transferRx: number;
  transferTx: number;
};

export type TrafficReport = {
  period: TrafficQueryType['period'];
  start: string;
  endExclusive: string;
  quotaBytes: number | null;
  receivedBytes: number;
  sentBytes: number;
  totalBytes: number;
  exceeded: boolean;
  days: Array<{
    date: string;
    receivedBytes: number;
    sentBytes: number;
    totalBytes: number;
  }>;
};
