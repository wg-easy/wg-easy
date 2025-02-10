export default defineMetricsHandler('prometheus', async () => {
  return getMetricsJSON();
});
