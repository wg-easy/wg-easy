export default defineEventHandler(async (event) => {
  const { lang } = await readValidatedBody(event, validateZod(langType));
  setHeader(event, 'Content-Type', 'application/json');
  await Database.system.updateLanguage(lang);
  SERVER_DEBUG(`Update Language: ${lang}`);
  return { success: true };
});
