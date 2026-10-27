import { setHeader } from 'h3';

import { prometheus } from '#server/features/vpn/monitoring';
import { defineMetricsHandler } from '#server/utils/handler';

export default defineMetricsHandler('prometheus', async ({ event }) => {
  setHeader(event, 'Content-Type', 'text/plain');
  return prometheus();
});
