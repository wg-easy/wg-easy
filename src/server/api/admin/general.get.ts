export default defineEventHandler(async () => {
  const system = await Database.system.get();
  return system.general;
});
