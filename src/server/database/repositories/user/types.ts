import type { InferSelectModel } from 'drizzle-orm';
import type { user } from './schema';
import z from 'zod';

export type UserType = InferSelectModel<typeof user>;

const username = z
  .string({ message: 'zod.user.username' })
  .min(8, 'zod.user.usernameMin')
  .pipe(safeStringRefine);

const password = z
  .string({ message: 'zod.user.password' })
  .min(12, 'zod.user.passwordMin')
  .regex(/[A-Z]/, 'zod.user.passwordUppercase')
  .regex(/[a-z]/, 'zod.user.passwordLowercase')
  .regex(/\d/, 'zod.user.passwordNumber')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'zod.user.passwordSpecial')
  .pipe(safeStringRefine);

const remember = z.boolean({ message: 'zod.user.remember' });

const name = z
  .string({ message: 'zod.user.name' })
  .min(1, 'zod.user.nameMin')
  .pipe(safeStringRefine);

const email = z
  .string({ message: 'zod.user.email' })
  .min(5, 'zod.user.emailMin')
  .email({ message: 'zod.user.emailInvalid' })
  .pipe(safeStringRefine)
  .nullable();

export const UserLoginSchema = z.object(
  {
    username: username,
    password: password,
    remember: remember,
  },
  { message: objectMessage }
);

const accept = z.boolean().refine((val) => val === true, {
  message: 'zod.user.accept',
});

export const UserSetupType = z.object(
  {
    username: username,
    password: password,
    accept: accept,
  },
  { message: objectMessage }
);

export const UserUpdateSchema = z.object(
  {
    name: name,
    email: email,
  },
  { message: objectMessage }
);
