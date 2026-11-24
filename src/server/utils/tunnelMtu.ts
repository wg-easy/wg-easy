import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { WG_ENV } from '#server/utils/config';
import { parseInterfaceName } from '#server/utils/interfaceName';
import { minimumIpv6Mtu } from '#shared/contracts/validation';

const run = promisify(execFile);

type Route = { dev?: string; metrics?: { mtu?: number }[] };
type Link = { ifname: string; mtu: number };

async function ipJson<T>(args: string[]): Promise<T[]> {
  const { stdout } = await run('ip', ['-j', ...args]);
  return JSON.parse(stdout);
}

async function underlayMtu(device: string) {
  const links = await ipJson<Link>(['link', 'show']);
  const linkMtus = new Map(links.map((link) => [link.ifname, link.mtu]));
  function routeMtu(route?: Route) {
    if (route?.dev && route.dev !== device) {
      return (
        route.metrics?.find((metric) => metric.mtu)?.mtu ??
        linkMtus.get(route.dev)
      );
    }
  }

  // Include endpoints learned through handshakes as well as configured peers.
  const show = (field: string) =>
    run(WG_ENV.WG_EXECUTABLE, ['show', device, field]);
  const { stdout } = await show('endpoints');
  const endpoints = new Set(
    stdout
      .matchAll(/\t(\[[^\]]+\]|[\d.]+):\d+$/gm)
      .map((match) => match[0].trim())
  );
  if (endpoints.size) {
    // Match the marked UDP socket even when the tunnel carries a default route.
    const fwmark = (await show('fwmark')).stdout.trim();
    const listenPort = (await show('listen-port')).stdout.trim();
    const mark = fwmark === 'off' ? [] : ['mark', fwmark];
    let smallest = Infinity;
    for (const endpoint of endpoints) {
      const separator = endpoint.lastIndexOf(':');
      const [host, scope] = endpoint
        .slice(0, separator)
        .replace(/^\[|\]$/g, '')
        .split('%');
      const lookup = [
        'route',
        'get',
        host!,
        ...(scope ? ['oif', scope] : []),
        ...mark,
        'ipproto',
        'udp',
        'sport',
        listenPort,
        'dport',
        endpoint.slice(separator + 1),
      ];
      // An unreachable peer must not hide another peer's usable route.
      const routes = await ipJson<Route>(lookup).catch(() => []);
      const mtu = routeMtu(routes[0]);
      if (mtu) {
        smallest = Math.min(smallest, mtu);
      }
    }
    if (Number.isFinite(smallest)) {
      return smallest;
    }
  }

  for (const family of ['-4', '-6']) {
    const routes = await ipJson<Route>([family, 'route', 'show', 'default']);
    const mtu = routes.map(routeMtu).find((value) => value !== undefined);
    if (mtu !== undefined) {
      return mtu;
    }
  }
  return 1500;
}

export async function setTunnelMtu(name: string, mtu: number | null) {
  if (process.platform !== 'linux') {
    return;
  }
  const device = parseInterfaceName(name);
  // Allow for the outer IPv6, UDP and tunnel headers, as wg-quick does.
  let value = mtu;
  if (value === null) {
    const detected = (await underlayMtu(device)) - 80;
    // Linux drops configured IPv6 addresses when the link falls below 1280.
    value = WG_ENV.DISABLE_IPV6 ? detected : Math.max(minimumIpv6Mtu, detected);
  }
  await run('ip', ['link', 'set', 'dev', device, 'mtu', String(value)]);
}
