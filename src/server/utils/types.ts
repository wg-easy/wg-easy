import type { ZodSchema } from 'zod';
import z from 'zod';
import type { H3Event, EventHandlerRequest } from 'h3';

export const objectMessage = 'zod.body';

export const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: 'zod.stringMalformed' }
  );

// TODO: create custom getValidatedRouterParams and readValidatedBody wrapper

export const EnabledSchema = z.boolean({ message: 'zod.enabled' });

export const MtuSchema = z
  .number({ message: 'zod.mtu' })
  .min(1280, { message: 'zod.mtuMin' })
  .max(9000, { message: 'zod.mtuMax' });

export const PortSchema = z
  .number({ message: 'zod.port' })
  .min(1, { message: 'zod.portMin' })
  .max(65535, { message: 'zod.portMax' });

export const PersistentKeepaliveSchema = z
  .number({ message: 'zod.persistentKeepalive' })
  .min(0, 'zod.persistentKeepaliveMin')
  .max(65535, 'zod.persistentKeepaliveMax');

export const AddressSchema = z
  .string({ message: 'zod.address' })
  .min(1, { message: 'zod.addressMin' })
  .pipe(safeStringRefine);

export const DnsSchema = z
  .array(AddressSchema, { message: 'zod.dns' })
  .min(1, 'zod.dnsMin');

export const AllowedIpsSchema = z
  .array(AddressSchema, { message: 'zod.allowedIps' })
  .min(1, { message: 'zod.allowedIpsMin' });

export const schemaForType =
  <T>() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <S extends z.ZodType<T, any, any>>(arg: S) => {
    return arg;
  };

export function validateZod<T>(
  schema: ZodSchema<T>,
  event?: H3Event<EventHandlerRequest>
) {
  return async (data: unknown) => {
    let t: null | ((key: string) => string) = null;

    if (event) {
      t = await useTranslation(event);
    }

    try {
      return await schema.parseAsync(data);
    } catch (error) {
      let message = 'Unexpected Error';
      if (error instanceof z.ZodError) {
        message = error.issues
          .map((v) => {
            let m = v.message;

            if (t) {
              m = t(m);
            }

            return m;
          })
          .join('; ');
      }
      throw new Error(message);
    }
  };
}
