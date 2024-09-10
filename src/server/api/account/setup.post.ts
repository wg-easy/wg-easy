export default defineEventHandler(async (event) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(passwordType)
  );
  const users = await Database.user.findAll();
  if (users.length !== 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid state',
    });
  }
  await Database.user.create(username, password);
  return { success: true };
});
