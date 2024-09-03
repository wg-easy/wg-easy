export default defineEventHandler(async () => {
  const system = await Database.getSystem();
  return {
    trafficStats: system.trafficStats,
    sortClients: system.sortClients,
    clientExpiration: system.clientExpiration,
    oneTimeLinks: system.oneTimeLinks,
  };
});
