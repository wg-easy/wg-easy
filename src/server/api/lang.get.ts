export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');

  const provider = InMemory; // TODO multiple provider
  const lang = await SystemRepository.getLang(provider);
  return lang;
});
