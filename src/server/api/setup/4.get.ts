export default defineSetupEventHandler(4, async () => {
  const result = await cachedGetIpInformation();
  return result;
});
