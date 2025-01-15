export default defineEventHandler(async (event) => {
  const { username, password, remember } = await readValidatedBody(
    event,
    validateZod(credentialsType, event)
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

  const conf = { ...system.sessionConfig };

  if (remember) {
    conf.cookie = {
      ...(system.sessionConfig.cookie ?? {}),
      maxAge: system.general.sessionTimeout,
    };
  }

  const session = await useSession<WGSession>(event, conf);

  const data = await session.update({
    userId: user.id,
  });

  SERVER_DEBUG(`New Session: ${data.id}`);

  return { success: true };
});
