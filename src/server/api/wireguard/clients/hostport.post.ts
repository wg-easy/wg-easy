export default defineEventHandler(async (event) => {
  const { host, port } = await readValidatedBody(
    event,
    validateZod(hostPortType, event)
  );
  await Database.system.updateClientsHostPort(host, port);
  return { success: true };
});
