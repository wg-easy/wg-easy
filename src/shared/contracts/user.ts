import z from 'zod';

import { safeStringRefine, t } from '#shared/contracts/validation';

const username = z
  .string({ message: t('validation.user.username') })
  .min(1, t('validation.user.username'));

const password = z
  .string({ message: t('validation.user.password') })
  .min(12, t('validation.user.password'))
  .pipe(safeStringRefine);

const remember = z.boolean({ message: t('validation.user.remember') });

const totpCode = z
  .string({ message: t('validation.user.totpCode') })
  // min and max to improve error messages
  .min(6, t('validation.user.totpCode'))
  .max(6, t('validation.user.totpCode'))
  .regex(/^\d{6}$/, t('validation.user.totpCode'))
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
    message: t('validation.user.passwordMatch'),
  });

const name = z
  .string({ message: t('validation.user.name') })
  .min(1, 'validation.user.name')
  .pipe(safeStringRefine);

const email = z
  .email({ message: t('validation.user.emailInvalid') })
  .min(5, t('validation.user.email'))
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
    message: t('validation.user.passwordMatch'),
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
