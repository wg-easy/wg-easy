import type { SessionConfig } from 'h3';

export default defineEventHandler(async (event) => {
  const { username, password, remember } = await readValidatedBody(
    event,
    validateZod(credentialsType)
  );

  const users = await Database.user.findAll();
  const user = users.find((user) => user.username == username);
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

  const system = await Database.system.get();

  const conf: SessionConfig = system.sessionConfig;

  if (remember) {
    conf.cookie = {
      ...(system.sessionConfig.cookie ?? {}),
      maxAge: system.sessionTimeout,
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
