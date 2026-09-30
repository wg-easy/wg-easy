import { useTranslation } from '@intlify/h3';
import type { ZodType } from 'zod';
import z from 'zod';
import type { H3Event, EventHandlerRequest } from 'h3';
import { isIP } from 'is-ip';
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
    { message: t('zod.stringMalformed') }
  );

function hasControlChars(str: string) {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x1F\x7F]/.test(str);
}

export const controlStringRefine = z
  .string()
  .refine((v) => !hasControlChars(v), { message: t('zod.stringMalformed') });

export const EnabledSchema = z.boolean({ message: t('zod.enabled') });

export const MtuSchema = z
  .number({ message: t('zod.mtu') })
  // min for IPv6 is 1280, but we allow lower for IPv4
  .min(1024, { message: t('zod.mtu') })
  .max(9000, { message: t('zod.mtu') });

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
        message: t('zod.generic.validNumberRange'),
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

/** Length of a WireGuard key in bytes */
const KEY_LENGTH = 32;

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
      const key = Buffer.from(v, 'base64');

      return key.length === KEY_LENGTH && key.toString('base64') === v;
    },
    { message: t('zod.keyMalformed') }
  )
  .nullable();

export const ISchema = z
  .string()
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .nullable();

export const PortSchema = z
  .number({ message: t('zod.port') })
  .min(1, { message: t('zod.port') })
  .max(65535, { message: t('zod.port') });

export const RoutingTableSchema = z
  .string({ message: t('zod.interface.routingTable') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .refine((v) => /^(auto|off|\d+)$/.test(v), {
    message: t('zod.interface.routingTable'),
  });

export const PersistentKeepaliveSchema = z
  .number({ message: t('zod.persistentKeepalive') })
  .min(0, t('zod.persistentKeepalive'))
  .max(65535, t('zod.persistentKeepalive'));

export const AddressSchema = z
  .string({ message: t('zod.address') })
  .min(1, { message: t('zod.address') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

export const DnsSchema = z.array(AddressSchema, { message: t('zod.dns') });

export const AllowedIpsSchema = z
  .array(AddressSchema, { message: t('zod.allowedIps') })
  .min(1, { message: t('zod.allowedIps') });

// Validation for firewall IP entries
const FirewallIpEntrySchema = z
  .string({ message: t('zod.client.firewallIps') })
  .min(1, { message: t('zod.client.firewallIps') })
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
      message: t('zod.client.firewallIpsInvalid'),
    }
  );

export const FirewallIpsSchema = z.array(FirewallIpEntrySchema, {
  message: t('zod.client.firewallIps'),
});

export const FileSchema = z.object({
  file: z.string({ message: t('zod.file') }),
});

export const HookSchema = z
  .string({ message: t('zod.hook') })
  .pipe(safeStringRefine);

export const schemaForType =
  <T>() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <S extends z.ZodType<T, any, any>>(arg: S) => {
    return arg;
  };

export function validateZod<T>(
  schema: ZodType<T>,
  event: H3Event<EventHandlerRequest>
) {
  return async (data: unknown) => {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      let message = 'Unexpected Error';
      if (error instanceof z.ZodError) {
        const t = await useTranslation(event);

        message = error.issues
          .map((v) => {
            let m = v.message;

            if (t) {
              let newMessage = null;
              if (v.message.startsWith('zod.')) {
                switch (v.code) {
                  case 'too_small':
                    switch (v.origin) {
                      case 'string':
                        newMessage = t('zod.generic.stringMin', {
                          field: t(v.message),
                          min: v.minimum,
                        });
                        break;
                      case 'number':
                        newMessage = t('zod.generic.numberMin', {
                          field: t(v.message),
                          min: v.minimum,
                        });
                        break;
                    }
                    break;
                  case 'too_big':
                    switch (v.origin) {
                      case 'string':
                        newMessage = t('zod.generic.stringMax', {
                          field: t(v.message),
                          max: v.maximum,
                        });
                        break;
                      case 'number':
                        newMessage = t('zod.generic.numberMax', {
                          field: t(v.message),
                          max: v.maximum,
                        });
                        break;
                    }
                    break;
                  case 'invalid_type': {
                    if (v.input === null || v.input === undefined) {
                      newMessage = t('zod.generic.required', {
                        field: v.path.join('.'),
                      });
                    } else {
                      switch (v.expected) {
                        case 'string':
                          newMessage = t('zod.generic.validString', {
                            field: t(v.message),
                          });
                          break;
                        case 'boolean':
                          newMessage = t('zod.generic.validBoolean', {
                            field: t(v.message),
                          });
                          break;
                        case 'number':
                          newMessage = t('zod.generic.validNumber', {
                            field: t(v.message),
                          });
                          break;
                        case 'array':
                          newMessage = t('zod.generic.validArray', {
                            field: t(v.message),
                          });
                          break;
                      }
                    }
                    break;
                  }
                }
              }
              if (!newMessage && v.message === 'zod.generic.validNumberRange') {
                newMessage = t(v.message, { field: v.path.join('.') });
              }
              if (newMessage) {
                m = newMessage;
              } else {
                m = t(v.message);
              }
            }

            return m;
          })
          .join('; ');
      }
      // eslint-disable-next-line preserve-caught-error
      throw new Error(message);
    }
  };
}

/**
 * exhaustive check
 */
export function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}

export const typesTestExports = { FirewallIpEntrySchema };
