import { readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { UserUpdateSchema } from '#db/repositories/user/types';

export default definePermissionEventHandler(
  'me',
  'update',
  async ({ event, user, checkPermissions }) => {
    const { name, email } = await readValidatedBody(
      event,
      validateZod(UserUpdateSchema, event)
    );

    checkPermissions(user);

    await Database.users.update(user.id, name, email);
    return { success: true };
  }
);
