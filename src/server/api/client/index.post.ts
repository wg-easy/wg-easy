export default defineEventHandler(async (event) => {
  const { name, expireDate } = await readValidatedBody(
    event,
    validateZod(createType)
  );
  await WireGuard.createClient({ name, expireDate });
  return { success: true };
});
