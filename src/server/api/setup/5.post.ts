export default defineEventHandler(async (event) => {
  const setupDone = await Database.setup.done();
  if (setupDone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid state',
    });
  }

  const { host, port } = await readValidatedBody(
    event,
    validateZod(hostPortType, event)
  );
  await Database.system.updateClientsHostPort(host, port);
  await Database.setup.set('success');
  return { success: true };
});
