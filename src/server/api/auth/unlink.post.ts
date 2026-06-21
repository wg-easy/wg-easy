import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';

export default definePermissionEventHandler(
  'me',
  'update',
  async ({ user, checkPermissions }) => {
    checkPermissions(user);

    await Database.users.unlinkOauth(user.id);

    return { success: true };
  }
);
