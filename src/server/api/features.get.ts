export default defineEventHandler(async () => {
  const system = await Database.system.get();
  return {
    trafficStats: system.trafficStats,
    sortClients: system.sortClients,
    clientExpiration: system.clientExpiration,
    oneTimeLinks: system.oneTimeLinks,
  };
});
