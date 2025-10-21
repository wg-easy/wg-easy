import type { ZodSchema } from 'zod';
import z from 'zod';
import type { H3Event, EventHandlerRequest } from 'h3';

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
