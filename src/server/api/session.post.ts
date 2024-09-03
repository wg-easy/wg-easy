import type { SessionConfig } from 'h3';

export default defineEventHandler(async (event) => {
  const { username, password, remember } = await readValidatedBody(
    event,
    validateZod(credentialsType)
  );

  const users = await Database.getUsers();
  const user = users.find((user) => user.username == username);
  if (!user)
    throw createError({
      statusCode: 400,
      statusMessage: 'Incorrect credentials',
    });

  const userHashPassword = user.password;
  if (!isPasswordValid(password, userHashPassword)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Incorrect credentials',
    });
  }

  const system = await Database.getSystem();

  const conf: SessionConfig = system.sessionConfig;

  if (remember) {
    conf.cookie = {
      ...(system.sessionConfig.cookie ?? {}),
      maxAge: system.cookieMaxAge * 60,
    };
  }

  const session = await useSession(event, {
    ...system.sessionConfig,
  });

  const data = await session.update({
    authenticated: true,
    userId: user.id,
  });

  SERVER_DEBUG(`New Session: ${data.id}`);

  return { success: true, requiresPassword: true };
});
