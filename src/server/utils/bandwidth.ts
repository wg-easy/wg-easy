import debug from 'debug';
import { exec } from './cmd';

const BW_DEBUG = debug('Bandwidth');

export interface BandwidthConfig {
  enabled: boolean;
  downloadMbps: number;
  uploadMbps: number;
}

export interface TcCommands {
  postUp: string;
  postDown: string;
}

// Valid interface name pattern (e.g., wg0, eth0, enp0s3)
const VALID_INTERFACE_PATTERN = /^[a-zA-Z0-9_-]{1,15}$/;

// Bandwidth limits (1 Mbps to 10 Gbps)
const MIN_BANDWIDTH_MBPS = 1;
const MAX_BANDWIDTH_MBPS = 10000;

/**
 * Validate interface name to prevent command injection
 */
function isValidInterfaceName(name: string): boolean {
  return VALID_INTERFACE_PATTERN.test(name);
}

/**
 * Clamp bandwidth value to safe range
 */
function clampBandwidth(value: number): number {
  if (value <= 0) return 0;
  return Math.min(Math.max(value, MIN_BANDWIDTH_MBPS), MAX_BANDWIDTH_MBPS);
}

/**
 * Check if IFB kernel module is available for upload limiting
 */
export async function checkIfbAvailable(): Promise<boolean> {
  try {
    await exec('modprobe ifb 2>/dev/null || lsmod | grep -q ifb', {
      log: false,
    });
    return true;
  } catch {
    BW_DEBUG('IFB module not available');
    return false;
  }
}

/**
 * Generate tc commands for bandwidth limiting
 * @param interfaceName - WireGuard interface name (e.g., wg0)
 * @param config - Bandwidth configuration
 * @param ifbAvailable - Whether IFB module is available for upload limiting
 */
export function generateTcCommands(
  interfaceName: string,
  config: BandwidthConfig,
  ifbAvailable: boolean = true
): TcCommands {
  // Validate interface name to prevent command injection
  if (!isValidInterfaceName(interfaceName)) {
    BW_DEBUG(`Invalid interface name: ${interfaceName}`);
    return { postUp: '', postDown: '' };
  }

  // Clamp bandwidth values to safe range
  const downloadMbps = clampBandwidth(config.downloadMbps);
  const uploadMbps = clampBandwidth(config.uploadMbps);

  if (!config.enabled || (downloadMbps === 0 && uploadMbps === 0)) {
    return { postUp: '', postDown: '' };
  }

  const postUpParts: string[] = [];
  const postDownParts: string[] = [];

  // Download limit (egress on wg interface)
  if (downloadMbps > 0) {
    postUpParts.push(
      `tc qdisc add dev ${interfaceName} root handle 1: htb default 10`,
      `tc class add dev ${interfaceName} parent 1: classid 1:1 htb rate ${downloadMbps}mbit ceil ${downloadMbps}mbit`,
      `tc class add dev ${interfaceName} parent 1:1 classid 1:10 htb rate ${downloadMbps}mbit ceil ${downloadMbps}mbit`
    );
    postDownParts.push(
      `tc qdisc del dev ${interfaceName} root 2>/dev/null || true`
    );
  }

  // Upload limit (ingress via IFB mirror)
  if (uploadMbps > 0 && ifbAvailable) {
    const ifbDev = 'ifb0';
    postUpParts.push(
      `ip link add ${ifbDev} type ifb 2>/dev/null || true`,
      `ip link set ${ifbDev} up`,
      `tc qdisc add dev ${interfaceName} handle ffff: ingress`,
      `tc filter add dev ${interfaceName} parent ffff: protocol all u32 match u32 0 0 action mirred egress redirect dev ${ifbDev}`,
      `tc qdisc add dev ${ifbDev} root handle 1: htb default 10`,
      `tc class add dev ${ifbDev} parent 1: classid 1:1 htb rate ${uploadMbps}mbit ceil ${uploadMbps}mbit`,
      `tc class add dev ${ifbDev} parent 1:1 classid 1:10 htb rate ${uploadMbps}mbit ceil ${uploadMbps}mbit`
    );
    postDownParts.push(
      `tc qdisc del dev ${interfaceName} handle ffff: ingress 2>/dev/null || true`,
      `ip link del ${ifbDev} 2>/dev/null || true`
    );
  }

  return {
    postUp: postUpParts.join('; '),
    postDown: postDownParts.join('; '),
  };
}
