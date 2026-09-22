/**
 * Default interface name
 */
const DEFAULT_INTERFACE_NAME = 'wg0';

/**
 * `wg-quick` compliant interface naming
 */
const INTERFACE_NAME_REGEX = /^[a-zA-Z0-9_=+.-]{1,15}$/;

export function parseInterfaceName(value: string | undefined): string {
  if (!value) {
    return DEFAULT_INTERFACE_NAME;
  }

  if (!INTERFACE_NAME_REGEX.test(value)) {
    throw new Error(`Invalid interface name: ${value}`);
  }

  return value;
}
