export default defineEventHandler(async (event) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(passwordSetupType, event)
  );
  const setupDone = await Database.setup.done();
  if (setupDone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid state',
    });
  }
  await Database.user.create(username, password);
  await Database.setup.set(5);
  return { success: true };
});
