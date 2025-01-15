export default defineEventHandler(async (event) => {
  // TODO: check password

  const system = await Database.system.get();
  if (!system.metrics.prometheus.enabled) {
    throw createError({
      statusCode: 400,
      message: 'Prometheus metrics are not enabled',
    });
  }

  setHeader(event, 'Content-Type', 'text/plain');
  return WireGuard.getMetrics();
});
