export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const system = await Database.getSystem();
  return system.lang;
});
