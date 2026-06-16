import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import type { user } from './schema';

export type UserType = InferSelectModel<typeof user>;

const username = z
  .string({ message: t('zod.user.username') })
  .min(2, t('zod.user.username'))
  .pipe(safeStringRefine);

const password = z
  .string({ message: t('zod.user.password') })
  .min(12, t('zod.user.password'))
  .pipe(safeStringRefine);

const remember = z.boolean({ message: t('zod.user.remember') });

const totpCode = z
  .string({ message: t('zod.user.totpCode') })
  // min and max to improve error messages
  .min(6, t('zod.user.totpCode'))
  .max(6, t('zod.user.totpCode'))
  .regex(/^\d{6}$/, t('zod.user.totpCode'))
  .pipe(safeStringRefine);

export const UserLoginSchema = z.object({
  username: username,
  password: password,
  remember: remember,
});

export const UserSetupSchema = z
  .object({
    username: username,
    password: password,
    confirmPassword: password,
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: t('zod.user.passwordMatch'),
  });

const name = z
  .string({ message: t('zod.user.name') })
  .min(1, 'zod.user.name')
  .pipe(safeStringRefine);

const email = z
  .email({ message: t('zod.user.emailInvalid') })
  .min(5, t('zod.user.email'))
  .pipe(safeStringRefine)
  .nullable();

export const UserUpdateSchema = z.object({
  name: name,
  email: email,
});

export const UserUpdatePasswordSchema = z
  .object({
    currentPassword: password.nullable(),
    newPassword: password,
    confirmPassword: password,
  })
  .refine((val) => val.newPassword === val.confirmPassword, {
    message: t('zod.user.passwordMatch'),
  });

export const UserUpdateTotpSchema = z.union([
  z.object({
    type: z.literal('setup'),
  }),
  z.object({
    type: z.literal('create'),
    code: totpCode,
  }),
  z.object({
    type: z.literal('delete'),
    currentPassword: password,
  }),
]);

export const Verify2faSchema = z.object({
  totpCode: totpCode,
});
