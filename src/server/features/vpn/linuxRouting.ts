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

export type RouteFamily = 'ipv4' | 'ipv6';

export const routeMetric = (family: RouteFamily) =>
  family === 'ipv4' ? 0 : 1024;

export function directRoute(route: KernelRoute, device: string) {
  return (
    route.dev === device &&
    !route.gateway &&
    (route.type === undefined ||
      Number(route.type) === 1 ||
      route.type === 'unicast')
  );
}

// Numeric, detailed iproute2 output identifies attributes that distinguish
// our direct route from a replacement with the same protocol and metric.
export function matchesOwnedRoute(
  route: KernelRoute,
  device: string,
  family: RouteFamily
) {
  return (
    directRoute(route, device) &&
    Number(route.protocol) === routeProtocol &&
    (route.metric ?? 0) === routeMetric(family) &&
    Number(route.scope) === (family === 'ipv4' ? 253 : 0) &&
    !route.flags?.length &&
    (route.pref === undefined || route.pref === 'medium') &&
    Object.keys(route).every((key) =>
      [
        'dst',
        'dev',
        'table',
        'protocol',
        'metric',
        'scope',
        'flags',
        'type',
        'pref',
      ].includes(key)
    )
  );
}

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
