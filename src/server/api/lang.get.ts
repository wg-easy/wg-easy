export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');

  const system = await InMemory.getSystem();
  if (system) {
    const { lang } = system;
    return lang;
  }
  return 'en';
});
