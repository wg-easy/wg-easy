import type { ZodSchema } from 'zod';
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

const H_MIN = 5;
const H_MAX = 2 ** 31 - 1;

export const HSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine(
    (v) => {
      if (!v) return false;

      if (!/^\d+(-\d+)?$/.test(v)) return false;

      if (!v.includes('-')) {
        const num = Number(v);
        return num >= H_MIN && num <= H_MAX;
      }

      const [min, max] = v.split('-').map(Number);
      return min && max && min >= H_MIN && max <= H_MAX && min <= max;

      return false;
    },
    {
      message: t('zod.generic.validNumberRange'),
    }
  )
  .transform((v) => {
    if (!v.includes('-')) return `${Number(v)}`;

    const [min, max] = v.split('-').map(Number);
    return min === max ? `${min}` : `${min}-${max}`;
  })
  .nullable();

export const ISchema = z.string().nullable();

export const PortSchema = z
  .number({ message: t('zod.port') })
  .min(1, { message: t('zod.port') })
  .max(65535, { message: t('zod.port') });

export const PersistentKeepaliveSchema = z
  .number({ message: t('zod.persistentKeepalive') })
  .min(0, t('zod.persistentKeepalive'))
  .max(65535, t('zod.persistentKeepalive'));

export const AddressSchema = z
  .string({ message: t('zod.address') })
  .min(1, { message: t('zod.address') })
  .pipe(safeStringRefine);

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
  schema: ZodSchema<T>,
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
                        newMessage = t('zod.generic.stringMin', [
                          t(v.message),
                          v.minimum,
                        ]);
                        break;
                      case 'number':
                        newMessage = t('zod.generic.numberMin', [
                          t(v.message),
                          v.minimum,
                        ]);
                        break;
                    }
                    break;
                  case 'invalid_type': {
                    if (v.input === null || v.input === undefined) {
                      newMessage = t('zod.generic.required', [
                        v.path.join('.'),
                      ]);
                    } else {
                      switch (v.expected) {
                        case 'string':
                          newMessage = t('zod.generic.validString', [
                            t(v.message),
                          ]);
                          break;
                        case 'boolean':
                          newMessage = t('zod.generic.validBoolean', [
                            t(v.message),
                          ]);
                          break;
                        case 'number':
                          newMessage = t('zod.generic.validNumber', [
                            t(v.message),
                          ]);
                          break;
                        case 'array':
                          newMessage = t('zod.generic.validArray', [
                            t(v.message),
                          ]);
                          break;
                      }
                    }
                    break;
                  }
                }
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
