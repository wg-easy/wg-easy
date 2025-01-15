export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(
    event,
    validateZod(cidrUpdateType, event)
  );

  await WireGuard.updateAddressRange(data);
  return { success: true };
});
