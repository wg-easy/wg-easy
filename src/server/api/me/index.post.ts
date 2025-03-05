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
