import z from 'zod';

import { parseUtcDate } from '#shared/utils/time';
import { TRAFFIC_PERIODS } from '#shared/utils/traffic';

export type { TrafficReport } from '#shared/utils/traffic';

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
