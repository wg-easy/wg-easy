export default defineEventHandler(async () => {
  const system = await Database.system.get();
  // TODO: handle through wireguard to update conf accordingly
  return system.interface;
});
