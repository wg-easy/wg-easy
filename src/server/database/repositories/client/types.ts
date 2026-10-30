import type { InferSelectModel } from 'drizzle-orm';

import type { client } from './schema';

export type ClientType = InferSelectModel<typeof client>;

export type ClientNextIpType = Pick<ClientType, 'ipv4Address' | 'ipv6Address'>;
