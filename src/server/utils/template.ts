// ! Auto Imports are not supported in this file

import type { InterfaceType } from '#db/repositories/interface/types';

/**
 * Replace all {{key}} in the template with the values[key]
 */
export function template(templ: string, values: Record<string, string>) {
  return templ.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

export function removeNewlines(templ: string) {
  return templ.replace(/\r\n|\r|\n/g, ' ');
}

/**
 * Available keys:
 * - ipv4Cidr: IPv4 CIDR
 * - ipv6Cidr: IPv6 CIDR
 * - device: Network device
 * - port: Port number
 * - uiPort: UI port number
 */
export function iptablesTemplate(templ: string, wgInterface: InterfaceType) {
  return template(removeNewlines(templ), {
    ipv4Cidr: wgInterface.ipv4Cidr,
    ipv6Cidr: wgInterface.ipv6Cidr,
    device: wgInterface.device,
    port: wgInterface.port.toString(),
    uiPort: WG_ENV.PORT,
  });
}
