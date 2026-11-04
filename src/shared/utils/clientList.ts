export const clientStatusFilters = [
  'all',
  'enabled',
  'disabled',
  'online',
  'offline',
] as const;

export const clientExpiryFilters = [
  'all',
  'permanent',
  'expiring',
  'expired',
] as const;

export const clientSortFields = [
  'name',
  'createdAt',
  'ipv4Address',
  'expiresAt',
] as const;

export type ClientStatusFilter = (typeof clientStatusFilters)[number];
export type ClientExpiryFilter = (typeof clientExpiryFilters)[number];
export type ClientSortField = (typeof clientSortFields)[number];
export type ClientSortOrder = `${ClientSortField}:${'asc' | 'desc'}`;
