import type { ZodSchema, ZodTypeDef } from 'zod';
import { z, ZodError } from 'zod';
import type { H3Event, EventHandlerRequest } from 'h3';

const objectMessage = 'zod.body';

const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: 'zod.stringMalformed' }
  );

const host = z
  .string({ message: 'zod.host' })
  .min(1, 'zod.hostMin')
  .pipe(safeStringRefine);

const port = z
  .number({ message: 'zod.port' })
  .min(1, 'zod.portMin')
  .max(65535, 'zod.portMax');

export const hostPortType = z.object({
  host: host,
  port: port,
});

const id = z.string().uuid('zod.id').pipe(safeStringRefine);

export const clientIdType = z.object(
  {
    clientId: id,
  },
  { message: objectMessage }
);

const oneTimeLink = z
  .string({ message: 'zod.otl' })
  .min(1, 'zod.otlMin')
  .pipe(safeStringRefine);

export const oneTimeLinkType = z.object(
  {
    oneTimeLink: oneTimeLink,
  },
  { message: objectMessage }
);

const name = z
  .string({ message: 'zod.name' })
  .min(1, 'zod.nameMin')
  .pipe(safeStringRefine);

const expireDate = z
  .string({ message: 'zod.expireDate' })
  .min(1, 'zod.expireDateMin')
  .pipe(safeStringRefine)
  .nullable();

export const createType = z.object(
  {
    name: name,
    expireDate: expireDate,
  },
  { message: objectMessage }
);

const file = z.string({ message: 'zod.file' }).pipe(safeStringRefine);
const file_ = z.instanceof(File, { message: 'zod.file' });

export const fileType = z.object(
  {
    file: file,
  },
  { message: objectMessage }
);
export const fileType_ = z.object(
  {
    file: file_,
  },
  { message: objectMessage }
);

const username = z
  .string({ message: 'zod.username' })
  .min(8, 'zod.usernameMin')
  .pipe(safeStringRefine);

const password = z
  .string({ message: 'zod.password' })
  .min(12, 'zod.passwordMin')
  .regex(/[A-Z]/, 'zod.passwordUppercase')
  .regex(/[a-z]/, 'zod.passwordLowercase')
  .regex(/\d/, 'zod.passwordNumber')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'zod.passwordSpecial')
  .pipe(safeStringRefine);

const remember = z.boolean({ message: 'zod.remember' });

export const credentialsType = z.object(
  {
    username: username,
    password: password,
    remember: remember,
  },
  { message: objectMessage }
);

export const passwordType = z.object(
  {
    username: username,
    password: password,
  },
  { message: objectMessage }
);

const accept = z.boolean().refine((val) => val === true, {
  message: 'zod.accept',
});

export const passwordSetupType = z.object(
  {
    username: username,
    password: password,
    accept: accept,
  },
  { message: objectMessage }
);

const address = z
  .string({ message: 'zod.address' })
  .min(1, { message: 'zod.addressMin' })
  .pipe(safeStringRefine);

const address4 = z
  .string({ message: 'zod.address4' })
  .min(1, { message: 'zod.address4Min' })
  .pipe(safeStringRefine);

const address6 = z
  .string({ message: 'zod.address6' })
  .min(1, { message: 'zod.address6Min' })
  .pipe(safeStringRefine);

const allowedIPs = z
  .array(address, { message: 'zod.allowedIPs' })
  .min(1, { message: 'zod.allowedIPsMin' });

const mtu = z
  .number({ message: 'zod.mtu' })
  .min(1280, { message: 'zod.mtuMin' })
  .max(9000, { message: 'zod.mtuMax' });

const persistentKeepalive = z
  .number({ message: 'zod.persistentKeepalive' })
  .min(0, 'zod.persistentKeepaliveMin')
  .max(65535, 'zod.persistentKeepaliveMax');

export const clientUpdateType = z.object({
  name: name,
  enabled: z.boolean(),
  expiresAt: expireDate,
  address4: address4,
  address6: address6,
  allowedIPs: allowedIPs,
  serverAllowedIPs: z.array(address, { message: 'zod.serverAllowedIPs' }),
  mtu: mtu,
  persistentKeepalive: persistentKeepalive,
});

export const generalUpdateType = z.object({
  sessionTimeout: z.number({ message: 'zod.sessionTimeout' }),
});

export const interfaceUpdateType = z.object({
  mtu: z.number({ message: 'zod.mtu' }),
  port: port,
  device: z.string({ message: 'zod.device' }),
});

export const userConfigUpdateType = z.object({
  host: host,
  port: port,
  allowedIps: allowedIPs,
  defaultDns: z.array(address, { message: 'zod.dns' }),
  mtu: mtu,
  persistentKeepalive: persistentKeepalive,
});

// from https://github.com/airjp73/rvf/blob/7e7c35d98015ea5ecff5affaf89f78296e84e8b9/packages/zod-form-data/src/helpers.ts#L117
type FormDataLikeInput = {
  [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]>;
  entries(): IterableIterator<[string, FormDataEntryValue]>;
};

export function validateZod<T>(
  schema: ZodSchema<T> | ZodSchema<T, ZodTypeDef, FormData | FormDataLikeInput>,
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
      if (error instanceof ZodError) {
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
