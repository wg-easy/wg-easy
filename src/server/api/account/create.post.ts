export default defineEventHandler(async (event) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(passwordType)
  );
  await Database.createUser(username, password);
  return { success: true };
});
