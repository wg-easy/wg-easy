export default defineEventHandler(async (event) => {
  const { name } = await readValidatedBody(event, validateZod(nameType));
  await WireGuard.createClient({ name });
  return { success: true };
});
