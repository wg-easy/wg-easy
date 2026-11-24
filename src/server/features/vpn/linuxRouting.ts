import { parseRoutingTableId } from '#shared/utils/routingTable';

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

function directRoute(route: KernelRoute, device: string) {
  return (
    route.dev === device &&
    !route.gateway &&
    (route.type === undefined ||
      Number(route.type) === 1 ||
      route.type === 'unicast')
  );
}

// For equally specific routes Linux prefers the lowest metric. All routes
// tied at that metric must lead directly to the tunnel.
export function preferredRoute(routes: KernelRoute[], device: string) {
  const metric = Math.min(...routes.map((route) => route.metric ?? 0));
  const preferred = routes.filter((route) => (route.metric ?? 0) === metric);
  return {
    metric,
    viaTunnel:
      preferred.length > 0 &&
      preferred.every((route) => directRoute(route, device)),
  };
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
  const id = parseRoutingTableId(setting);
  if (id === undefined) {
    throw new Error('Invalid Linux routing table');
  }
  return id || 254;
}
