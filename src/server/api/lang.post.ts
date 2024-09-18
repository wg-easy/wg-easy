export default defineEventHandler(async (event) => {
  const { lang } = await readValidatedBody(event, validateZod(langType));
  setHeader(event, 'Content-Type', 'application/json');
  await Database.system.updateLang(lang);
  SERVER_DEBUG(`Update Lang: ${lang}`);
  return { success: true };
});
