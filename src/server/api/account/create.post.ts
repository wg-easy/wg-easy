export default defineEventHandler(async (event) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(passwordType)
  );
  await Database.user.create(username, password);
  return { success: true };
});
