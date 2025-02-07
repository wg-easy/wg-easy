import { UserUpdateSchema } from '#db/repositories/user/types';

export default definePermissionEventHandler(
  actions.CLIENT,
  async ({ event, user }) => {
    const { name, email } = await readValidatedBody(
      event,
      validateZod(UserUpdateSchema)
    );
    await Database.users.update(user.id, name, email);
    return { success: true };
  }
);
