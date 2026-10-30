import z from 'zod';
import { isIP, isIPv4, isIPv6 } from 'is-ip';
import isCidr from 'is-cidr';

export type ID = number;

/**
 * return the string as is
 *
 * used for i18n ally
 */
export const t = (v: string) => v;

export const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: t('validation.stringMalformed') }
  );

function hasControlChars(str: string) {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x1F\x7F]/.test(str);
}

export const controlStringRefine = z
  .string()
  .refine((v) => !hasControlChars(v), {
    message: t('validation.stringMalformed'),
  });

export const EnabledSchema = z.boolean({ message: t('validation.enabled') });

export const MtuSchema = z
  .number({ message: t('validation.mtu') })
  // min for IPv6 is 1280, but we allow lower for IPv4
  .min(1024, { message: t('validation.mtu') })
  .max(9000, { message: t('validation.mtu') })
  .nullable();

export const JcSchema = z.number().min(1).max(128).nullable();

export const JminSchema = z.number().max(1279).nullable();

export const JmaxSchema = z.number().max(1280).nullable();

export const SSchema = z.number().max(1132).nullable();

const RANGE_REGEX = /^(\d+)(?:-(\d+))?$/;

function parseRange(value: string) {
  const match = RANGE_REGEX.exec(value);
  if (!match) return null;

  const lower = Number(match[1]);
  const upper = match[2] === undefined ? lower : Number(match[2]);

  if (!Number.isSafeInteger(lower) || !Number.isSafeInteger(upper)) return null;

  return { lower, upper };
}

/**
 * AmneziaWG accepts either a single number or an inclusive `lower-upper` range
 * for several parameters (see `u32_range_from_string` / `u16_range_from_string`
 * in amneziawg-tools). Values outside of `[min, max]` are silently truncated by
 * the parser, so they are rejected here instead.
 */
function rangeSchema(min: number, max: number) {
  return z
    .string()
    .transform((v) => v.replace(/\s+/g, ''))
    .refine(
      (v) => {
        const range = parseRange(v);
        if (!range) return false;

        return (
          range.lower >= min && range.upper <= max && range.lower <= range.upper
        );
      },
      {
        message: t('validation.messages.validNumberRange'),
      }
    )
    .transform((v) => {
      const range = parseRange(v);
      // cannot happen, the refine above already rejected unparsable values
      if (!range) return v;

      return range.lower === range.upper
        ? `${range.lower}`
        : `${range.lower}-${range.upper}`;
    })
    .nullable();
}

const H_MIN = 5;
const H_MAX = 2 ** 31 - 1;

/** H1-H4 packet header types, parsed as a uint32 range */
export const HSchema = rangeSchema(H_MIN, H_MAX);

/**
 * AmneziaWG 3.0+ parameters that are parsed as a uint16 range:
 * ContentPaddingAddition, RekeyAfterTime, RekeyTimeout, RejectAfterTime,
 * KeepaliveTimeout and MaxHandshakeAttempts.
 */
export const AwgRangeSchema = rangeSchema(0, 65535);

/**
 * A 32 byte key in canonical base64, the same format WireGuard uses for its
 * own keys. Used by the AmneziaWG 3.0+ `HeaderProtectionKey` parameter.
 */
export const KeySchema = z
  .string()
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .refine(
    (v) => {
      // 32 bytes occupy 43 base64 symbols; the last symbol has two zero padding bits.
      return /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(v);
    },
    { message: t('validation.keyMalformed') }
  )
  .nullable();

export const ISchema = z
  .string()
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .nullable();

export const PortSchema = z
  .int({ message: t('validation.portInteger') })
  .min(1, { message: t('validation.port') })
  .max(65535, { message: t('validation.port') });

export const RoutingTableSchema = z
  .string({ message: t('validation.interface.routingTable') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .refine((v) => /^(auto|off|\d+)$/.test(v), {
    message: t('validation.interface.routingTable'),
  });

export const PersistentKeepaliveSchema = z
  .number({ message: t('validation.persistentKeepalive') })
  .min(0, t('validation.persistentKeepalive'))
  .max(65535, t('validation.persistentKeepalive'));

export const AddressSchema = z
  .string({ message: t('validation.address') })
  .min(1, { message: t('validation.address') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

/** WireGuard endpoints require a host and a numeric UDP port. */
export const EndpointSchema = AddressSchema.refine(
  (value) => {
    const match = /^(\[[^\]]+\]|[^:\s]+):(\d{1,5})$/.exec(value);
    if (!match) return false;
    const host = match[1]!;
    const port = Number(match[2]);
    if (port < 1 || port > 65535) return false;
    if (host.startsWith('[')) return isIPv6(host.slice(1, -1));
    if (isIPv4(host)) return true;
    if (/^[\d.]+$/.test(host)) return false;
    const hostname = host.endsWith('.') ? host.slice(0, -1) : host;
    return (
      hostname.length <= 253 &&
      hostname
        .split('.')
        .every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))
    );
  },
  { message: t('validation.endpointInvalid') }
);

export const DnsSchema = z.array(AddressSchema, {
  message: t('validation.dns'),
});

// Each entry is a single IP or CIDR, anything else breaks the generated
// WireGuard config and the per-client firewall rules
export const AllowedIpEntrySchema = AddressSchema.refine(
  (v) => isIP(v) || isCidr(v) !== 0,
  { message: t('validation.allowedIpsInvalid') }
);

export const AllowedIpsSchema = z
  .array(AllowedIpEntrySchema, { message: t('validation.allowedIps') })
  .min(1, { message: t('validation.allowedIps') });

// Validation for firewall IP entries
const FirewallIpEntrySchema = z
  .string({ message: t('validation.client.firewallIps') })
  .min(1, { message: t('validation.client.firewallIps') })
  .refine(
    (entry) => {
      // Check if protocol suffix is present
      const hasProto = /\/(tcp|udp)$/i.test(entry);
      const entryWithoutProto = entry.replace(/\/(tcp|udp)$/i, '');

      // If protocol was specified without a port, it's invalid
      if (hasProto) {
        // Protocol requires port, so check for IP:port format
        const portMatch = entryWithoutProto.match(/^(.+):(\d+)$/);
        if (!portMatch) {
          return false;
        }
        const [, ipPart, portPart] = portMatch;
        const port = parseInt(portPart!, 10);
        const cleanIp = ipPart!.replace(/^\[|\]$/g, '');
        if (cleanIp.includes(':') && !/^\[.+\]$/.test(ipPart!)) return false;
        return (isIP(cleanIp) || isCidr(cleanIp)) && port >= 1 && port <= 65535;
      }

      // Check if it's just IP or CIDR first (handles IPv6 addresses)
      if (isIP(entryWithoutProto) || isCidr(entryWithoutProto)) {
        return true;
      }

      // Check if it's bracketed IPv6 without port: [::1]
      const bracketedMatch = entryWithoutProto.match(/^\[(.+)\]$/);
      if (bracketedMatch) {
        const innerIp = bracketedMatch[1];
        return isIP(innerIp!) || isCidr(innerIp!);
      }

      // Check if it's IP:port format (IPv4:port or [IPv6]:port)
      const portMatch = entryWithoutProto.match(/^(.+):(\d+)$/);
      if (portMatch) {
        const [, ipPart, portPart] = portMatch;
        const port = parseInt(portPart!, 10);

        // Remove IPv6 brackets if present
        const cleanIp = ipPart!.replace(/^\[|\]$/g, '');

        // Validate IP and port
        return (isIP(cleanIp) || isCidr(cleanIp)) && port >= 1 && port <= 65535;
      }

      return false;
    },
    {
      message: t('validation.client.firewallIpsInvalid'),
    }
  );

export const FirewallIpsSchema = z.array(FirewallIpEntrySchema, {
  message: t('validation.client.firewallIps'),
});

export const FileSchema = z.object({
  file: z.string({ message: t('validation.file') }),
});

export const HookSchema = z
  .string({ message: t('validation.hook') })
  .pipe(safeStringRefine);

/**
 * exhaustive check
 */
export function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}

export const typesTestExports = { FirewallIpEntrySchema };
