export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const system = await Database.system.get();
  return system.general.lang;
});
