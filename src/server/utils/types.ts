import type { ZodSchema } from 'zod';
import z from 'zod';
import type { H3Event } from 'h3';

export type ID = number;

/**
 * does not translate
 */
export function $i18n(text: string) {
  return text;
}

export const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: $i18n('zod.stringMalformed') }
  );

export const EnabledSchema = z.boolean({ message: $i18n('zod.enabled') });

export const MtuSchema = z
  .number({ message: $i18n('zod.mtu') })
  .min(1280, { message: $i18n('zod.mtu') })
  .max(9000, { message: $i18n('zod.mtu') });

export const PortSchema = z
  .number({ message: $i18n('zod.port') })
  .min(1, { message: $i18n('zod.port') })
  .max(65535, { message: $i18n('zod.port') });

export const PersistentKeepaliveSchema = z
  .number({ message: $i18n('zod.persistentKeepalive') })
  .min(0, $i18n('zod.persistentKeepalive'))
  .max(65535, $i18n('zod.persistentKeepalive'));

export const AddressSchema = z
  .string({ message: $i18n('zod.address') })
  .min(1, { message: $i18n('zod.address') })
  .pipe(safeStringRefine);

export const DnsSchema = z
  .array(AddressSchema, { message: $i18n('zod.dns') })
  .min(1, $i18n('zod.dns'));

export const AllowedIpsSchema = z
  .array(AddressSchema, { message: $i18n('zod.allowedIps') })
  .min(1, { message: $i18n('zod.allowedIps') });

export const FileSchema = z.object({
  file: z.string({ message: $i18n('zod.file') }),
});

export const HookSchema = z
  .string({ message: $i18n('zod.hook') })
  .pipe(safeStringRefine);

export const schemaForType =
  <T>() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <S extends z.ZodType<T, any, any>>(arg: S) => {
    return arg;
  };

export function validateZod<T>(schema: ZodSchema<T>, event: H3Event) {
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

            let newMessage = null;
            if (v.message.startsWith('zod.')) {
              switch (v.code) {
                case 'too_small':
                  switch (v.type) {
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
                  if (v.received === 'null' || v.received === 'undefined') {
                    newMessage = t('zod.generic.required', [v.path.join('.')]);
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
