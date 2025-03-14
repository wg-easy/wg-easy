export default definePermissionEventHandler('admin', 'any', async () => {
  const result = await cachedGetIpInformation();
  return result;
});
