export default defineMetricsHandler('prometheus', async ({ event }) => {
  setHeader(event, 'Content-Type', 'text/plain');
  return getPrometheusResponse();
});
