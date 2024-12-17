export default defineEventHandler(async (event) => {
  const { lang } = await readValidatedBody(event, validateZod(langType));
  await Database.system.updateLang(lang);
  return { success: true };
});
