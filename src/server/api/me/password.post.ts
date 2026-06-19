import { readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { UserUpdatePasswordSchema } from '#db/repositories/user/types';

export default definePermissionEventHandler(
  'me',
  'update',
  async ({ event, user, checkPermissions }) => {
    const { newPassword, currentPassword } = await readValidatedBody(
      event,
      validateZod(UserUpdatePasswordSchema, event)
    );

    checkPermissions(user);

    await Database.users.updatePassword(user.id, currentPassword, newPassword);
    return { success: true };
  }
);
