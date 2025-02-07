import { UserLoginSchema } from '#db/repositories/user/types';

export default defineEventHandler(async (event) => {
  const { username, password, remember } = await readValidatedBody(
    event,
    validateZod(UserLoginSchema, event)
  );

  const user = await Database.users.getByUsername(username);
  if (!user)
    throw createError({
      statusCode: 400,
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

  SERVER_DEBUG(`New Session: ${data.id}`);

  return { success: true };
});
