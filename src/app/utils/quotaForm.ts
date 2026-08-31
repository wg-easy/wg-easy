export function resolveQuotaClientIds(
  clientIds: number[],
  fixedClientId?: number
) {
  return fixedClientId === undefined ? clientIds : [fixedClientId];
}

const fallbackTimezones = [
  'UTC',
  'Africa/Johannesburg',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Pacific/Auckland',
];

export function resolveBrowserTimezone(
  resolve = () => Intl.DateTimeFormat().resolvedOptions().timeZone
) {
  try {
    return resolve() || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getQuotaTimezones(
  includedTimezone?: string,
  resolve = () => Intl.supportedValuesOf('timeZone')
) {
  let timezones: string[];
  try {
    timezones = resolve();
  } catch {
    timezones = fallbackTimezones;
  }

  const includedTimezones = includedTimezone ? [includedTimezone] : [];
  return [...new Set([...timezones, 'UTC', ...includedTimezones])].sort(
    (left, right) => left.localeCompare(right)
  );
}
