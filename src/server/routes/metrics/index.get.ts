export default defineEventHandler(async (event) => {
  // TODO: check password

  const prometheus = await Database.metrics.prometheus.get('wg0');
  if (!prometheus) {
    throw createError({
      statusCode: 400,
      message: 'Prometheus metrics are not enabled',
    });
  }

  setHeader(event, 'Content-Type', 'text/plain');
  return getPrometheusResponse();
});
