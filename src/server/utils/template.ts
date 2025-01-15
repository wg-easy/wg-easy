import type { DeepReadonly } from 'vue';
import type { System } from '~~/services/database/repositories/system';

/**
 * Replace all {{key}} in the template with the values[key]
 */
export function template(templ: string, values: Record<string, string>) {
  return templ.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * Available keys:
 * - address4: IPv4 address range
 * - address6: IPv6 address range
 * - device: Network device
 * - port: Port number
 */
export function iptablesTemplate(templ: string, system: DeepReadonly<System>) {
  return template(templ, {
    address4: system.userConfig.address4Range,
    address6: system.userConfig.address6Range,
    device: system.interface.device,
    port: system.interface.port.toString(),
  });
}
