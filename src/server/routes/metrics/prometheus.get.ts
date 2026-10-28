import { prometheus } from '#server/features/vpn/monitoring';
import { defineMetricsHandler } from '#server/utils/handler';

export default defineMetricsHandler('prometheus', async ({ event }) => {
  event.res.headers.set('Content-Type', 'text/plain');
  return prometheus();
});
