export default definePermissionEventHandler('admin', 'any', async () => {
  const config = await Database.general.getBandwidthConfig();
  const ifbAvailable = WireGuard.getIfbAvailable();

  return {
    enabled: config.bandwidthEnabled,
    downloadLimitMbps: config.downloadLimitMbps,
    uploadLimitMbps: config.uploadLimitMbps,
    ifbAvailable,
    uploadLimitActive:
      config.bandwidthEnabled &&
      config.uploadLimitMbps > 0 &&
      ifbAvailable,
  };
});
