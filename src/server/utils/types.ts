import type { ZodSchema } from 'zod';
import { z, ZodError } from 'zod';
import type { H3Event, EventHandlerRequest } from 'h3';
import { LOCALES } from '#shared/locales';

// TODO: use i18n for messages

const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: 'String is malformed' }
  );

const id = z.string().uuid('zod.id').pipe(safeStringRefine);

const address4 = z.string({ message: 'zod.address4' }).pipe(safeStringRefine);

const name = z
  .string({ message: 'zod.name' })
  .min(1, 'zod.nameMin')
  .pipe(safeStringRefine);

const file = z.string({ message: 'zod.file' }).pipe(safeStringRefine);
const file_ = z.instanceof(File, { message: 'zod.file' });

const username = z
  .string({ message: 'zod.username' })
  .min(8, 'zod.usernameMin') // i18n key
  .pipe(safeStringRefine);

const password = z
  .string({ message: 'zod.password' })
  .min(12, 'zod.passwordMin') // i18n key
  .regex(/[A-Z]/, 'zod.passwordUppercase') // i18n key
  .regex(/[a-z]/, 'zod.passwordLowercase') // i18n key
  .regex(/\d/, 'zod.passwordNumber') // i18n key
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'zod.passwordSpecial') // i18n key
  .pipe(safeStringRefine);

const accept = z.boolean().refine((val) => val === true, {
  message: 'zod.accept',
}); // i18n key

const remember = z.boolean({ message: 'zod.remember' }); // i18n key

const expireDate = z
  .string({ message: 'zod.expireDate' }) // i18n key
  .min(1, 'zod.expireDateMin') // i18n key
  .pipe(safeStringRefine)
  .nullable();

const oneTimeLink = z
  .string({ message: 'zod.otl' }) // i18n key
  .min(1, 'zod.otlMin') // i18n key
  .pipe(safeStringRefine);

const statistics = z.object(
  {
    enabled: z.boolean({ message: 'zod.statBool' }), // i18n key
    chartType: z.number({ message: 'zod.statNumber' }), // i18n key
  },
  { message: 'zod.stat' } // i18n key
);

const host = z
  .string({ message: 'zod.host' })
  .min(1, 'zod.hostMin')
  .pipe(safeStringRefine);

const port = z
  .number({ message: 'zod.port' })
  .min(1, 'zod.portMin')
  .max(65535, 'zod.portMax');

const objectMessage = 'zod.body'; // i18n key

const langs = LOCALES.map((lang) => lang.code);
const lang = z.enum(['', ...langs]);

export const langType = z.object({
  lang: lang,
});

export const hostPortType = z.object({
  host: host,
  port: port,
});

export const clientIdType = z.object(
  {
    clientId: id,
  },
  { message: "This shouldn't happen" }
);

export const address4Type = z.object(
  {
    address4: address4,
  },
  { message: objectMessage }
);

export const nameType = z.object(
  {
    name: name,
  },
  { message: objectMessage }
);

export const expireDateType = z.object(
  {
    expireDate: expireDate,
  },
  { message: objectMessage }
);

export const oneTimeLinkType = z.object(
  {
    oneTimeLink: oneTimeLink,
  },
  { message: objectMessage }
);

export const createType = z.object(
  {
    name: name,
    expireDate: expireDate,
  },
  { message: objectMessage }
);

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

export const passwordSetupType = z.object(
  {
    username: username,
    password: password,
    accept: accept,
  },
  { message: objectMessage }
);

export const statisticsType = z.object(
  {
    statistics: statistics,
  },
  { message: objectMessage }
);

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
      if (error instanceof ZodError) {
        message = error.issues
          .map((v) => {
            let m = v.message;

            if (t) {
              m = t(m); // m key else v.message
            }

            return m;
          })
          .join('; ');
      }
      throw new Error(message);
    }
  };
}
