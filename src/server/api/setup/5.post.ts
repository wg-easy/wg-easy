export default defineEventHandler(async (event) => {
  const { done } = await Database.general.getSetupStep();
  if (done) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid state',
    });
  }

  const { host, port } = await readValidatedBody(
    event,
    validateZod(hostPortType, event)
  );
  await Database.userConfigs.updateHostPort('wg0', host, port);
  await Database.general.setSetupStep(0);
  return { success: true };
});
