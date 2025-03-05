import { UserLoginSchema } from '#db/repositories/user/types';

export default defineEventHandler(async (event) => {
  const { username, password, remember } = await readValidatedBody(
    event,
    validateZod(UserLoginSchema, event)
  );

  // TODO: timing can be used to enumerate usernames

  const user = await Database.users.getByUsername(username);
  if (!user)
    throw createError({
      statusCode: 401,
      statusMessage: 'Incorrect credentials',
    });

  const userHashPassword = user.password;
  const passwordValid = await isPasswordValid(password, userHashPassword);
  if (!passwordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Incorrect credentials',
    });
  }

  const session = await useWGSession(event, remember);

  const data = await session.update({
    userId: user.id,
  });

  // TODO?: create audit log

  SERVER_DEBUG(`New Session: ${data.id} for ${user.id} (${user.username})`);

  return { success: true };
});
