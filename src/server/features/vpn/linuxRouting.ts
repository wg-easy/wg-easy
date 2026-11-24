export type KernelRoute = {
  dst: string;
  dev?: string;
  gateway?: string;
  table?: string | number;
  type?: string | number;
  protocol: string | number;
  metric?: number;
  scope?: string | number;
  flags?: string[];
  pref?: string;
};

// Linux route and rule protocol reserved by the application.
export const routeProtocol = 242;

export function kernelTable(table: KernelRoute['table']) {
  switch (table) {
    case undefined:
    case 'main':
      return 254;
    case 'default':
      return 253;
    case 'local':
      return 255;
    default:
      return Number(table);
  }
}

export function routingTable(setting: string) {
  if (setting === 'auto') {
    return 254;
  }
  // iproute2 reads a leading zero as octal and table zero as the main table.
  const id = Number(setting.startsWith('0') ? `0o${setting}` : setting);
  if (!/^\d+$/.test(setting) || !Number.isSafeInteger(id) || id > 0xffffffff) {
    throw new Error('Invalid Linux routing table');
  }
  return id || 254;
}
