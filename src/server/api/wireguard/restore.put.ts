export default defineEventHandler(async (event) => {
  const { file } = await readValidatedBody(event, validateZod(fileType));
  await WireGuard.restoreConfiguration(file);
  return { success: true };
});
