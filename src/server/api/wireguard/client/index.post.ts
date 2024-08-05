export default defineEventHandler(async (event) => {
  const { name } = await readBody(event);
  await WireGuard.createClient({ name });
  return { success: true };
});
