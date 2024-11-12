export default defineEventHandler(async (event) => {
  const setupDone = await Database.setup.done();
  if (setupDone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid state',
    });
  }

  const { lang } = await readValidatedBody(event, validateZod(langType));
  await Database.system.updateLang(lang);
  await Database.setup.set(2);
  return { success: true };
});
