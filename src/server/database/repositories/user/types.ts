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
  .min(6, t('zod.user.totpCode'))
  .pipe(safeStringRefine);

export const UserLoginSchema = z.object({
  username: username,
  password: password,
  remember: remember,
  totpCode: totpCode.optional(),
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
  .string({ message: t('zod.user.email') })
  .min(5, t('zod.user.email'))
  .email({ message: t('zod.user.emailInvalid') })
  .pipe(safeStringRefine)
  .nullable();

export const UserUpdateSchema = z.object({
  name: name,
  email: email,
});

export const UserUpdatePasswordSchema = z
  .object({
    currentPassword: password,
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
