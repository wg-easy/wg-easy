import type { InferSelectModel } from 'drizzle-orm';
import type { user } from './schema';

export type UserType = InferSelectModel<typeof user>;

const username = zod
  .string({ message: 'zod.user.username' })
  .min(8, 'zod.user.usernameMin')
  .pipe(safeStringRefine);

const password = zod
  .string({ message: 'zod.user.password' })
  .min(12, 'zod.user.passwordMin')
  .regex(/[A-Z]/, 'zod.user.passwordUppercase')
  .regex(/[a-z]/, 'zod.user.passwordLowercase')
  .regex(/\d/, 'zod.user.passwordNumber')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'zod.user.passwordSpecial')
  .pipe(safeStringRefine);

const remember = zod.boolean({ message: 'zod.user.remember' });

export const UserLoginSchema = zod.object(
  {
    username: username,
    password: password,
    remember: remember,
  },
  { message: objectMessage }
);

const accept = zod.boolean().refine((val) => val === true, {
  message: 'zod.user.accept',
});

export const UserSetupType = zod.object(
  {
    username: username,
    password: password,
    accept: accept,
  },
  { message: objectMessage }
);
