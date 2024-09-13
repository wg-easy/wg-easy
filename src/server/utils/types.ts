import type { ZodSchema } from 'zod';
import { z, ZodError } from 'zod';

// TODO: use i18n for messages

const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: 'String is malformed' }
  );

const id = z
  .string()
  .uuid('Client ID must be a valid UUID')
  .pipe(safeStringRefine);

const address4 = z
  .string({ message: 'IPv4 Address must be a valid string' })
  .pipe(safeStringRefine);

const name = z
  .string({ message: 'Name must be a valid string' })
  .min(1, 'Name must be at least 1 Character')
  .pipe(safeStringRefine);

const file = z
  .string({ message: 'File must be a valid string' })
  .pipe(safeStringRefine);

const username = z
  .string({ message: 'Username must be a valid string' })
  .min(8, 'Username must be at least 8 Characters')
  .pipe(safeStringRefine);

const password = z
  .string({ message: 'Password must be a valid string' })
  .min(12, 'Password must be at least 12 Characters')
  .regex(/[A-Z]/, 'Password must have at least 1 uppercase letter')
  .regex(/[a-z]/, 'Password must have at least 1 lowercase letter')
  .regex(/\d/, 'Password must have at least 1 number')
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    'Password must have at least 1 special character'
  )
  .pipe(safeStringRefine);

const remember = z.boolean({ message: 'Remember must be a valid boolean' });

const expireDate = z
  .string({ message: 'expiredDate must be a valid string' })
  .min(1, 'expiredDate must be at least 1 Character')
  .pipe(safeStringRefine)
  .nullable();

const oneTimeLink = z
  .string({ message: 'oneTimeLink must be a valid string' })
  .min(1, 'oneTimeLink must be at least 1 Character')
  .pipe(safeStringRefine);

const features = z.record(
  z.string({ message: 'key must be a valid string' }),
  z.object(
    {
      enabled: z.boolean({ message: 'enabled must be a valid boolean' }),
    },
    { message: 'value must be a valid object' }
  ),
  { message: 'features must be a valid record' }
);

const statistics = z.object(
  {
    enabled: z.boolean({ message: 'enabled must be a valid boolean' }),
    chartType: z.number({ message: 'chartType must be a valid number' }),
  },
  { message: 'statistics must be a valid object' }
);

const objectMessage = 'Body must be a valid object';

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

export const featuresType = z.object(
  {
    features: features,
  },
  { message: objectMessage }
);

export const statisticsType = z.object(
  {
    statistics: statistics,
  },
  { message: objectMessage }
);

export function validateZod<T>(schema: ZodSchema<T>) {
  return async (data: unknown) => {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      let message = 'Unexpected Error';
      if (error instanceof ZodError) {
        message = error.issues.map((v) => v.message).join('; ');
      }
      throw new Error(message);
    }
  };
}
