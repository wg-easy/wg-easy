import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import type { user } from './schema';

export type UserType = InferSelectModel<typeof user>;

const username = z
  .string({ message: $i18n('zod.user.username') })
  .min(2, $i18n('zod.user.username'))
  .pipe(safeStringRefine);

const password = z
  .string({ message: $i18n('zod.user.password') })
  .min(12, $i18n('zod.user.password'))
  .pipe(safeStringRefine);

const remember = z.boolean({ message: $i18n('zod.user.remember') });

const totpCode = z
  .string({ message: $i18n('zod.user.totpCode') })
  .min(6, $i18n('zod.user.totpCode'))
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
    message: $i18n('zod.user.passwordMatch'),
  });

const name = z
  .string({ message: $i18n('zod.user.name') })
  .min(1, 'zod.user.name')
  .pipe(safeStringRefine);

const email = z
  .string({ message: $i18n('zod.user.email') })
  .min(5, $i18n('zod.user.email'))
  .email({ message: $i18n('zod.user.emailInvalid') })
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
    message: $i18n('zod.user.passwordMatch'),
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
