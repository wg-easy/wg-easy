export default defineEventHandler(async (event) => {
  const { file } = await readBody(event);
  await WireGuard.restoreConfiguration(file);
  return { success: true };
});
