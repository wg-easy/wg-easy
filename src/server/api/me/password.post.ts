import { UserUpdatePasswordSchema } from '#db/repositories/user/types';

export default definePermissionEventHandler(
  'me',
  'update',
  async ({ event, user }) => {
    const { newPassword, currentPassword } = await readValidatedBody(
      event,
      validateZod(UserUpdatePasswordSchema)
    );
    await Database.users.updatePassword(user.id, currentPassword, newPassword);
    return { success: true };
  }
);
