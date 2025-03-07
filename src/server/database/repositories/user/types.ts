import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import type { user } from './schema';

export type UserType = InferSelectModel<typeof user>;

const username = z
  .string({ message: t('zod.user.username') })
  .min(8, t('zod.user.username'))
  .pipe(safeStringRefine);

const password = z
  .string({ message: t('zod.user.password') })
  .min(12, t('zod.user.password'))
  .regex(/[A-Z]/, t('zod.user.passwordUppercase'))
  .regex(/[a-z]/, t('zod.user.passwordLowercase'))
  .regex(/\d/, t('zod.user.passwordNumber'))
  .regex(/[!@#$%^&*(),.?":{}|<>]/, t('zod.user.passwordSpecial'))
  .pipe(safeStringRefine);

const remember = z.boolean({ message: t('zod.user.remember') });

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
