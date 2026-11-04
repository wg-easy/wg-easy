import { json } from '#server/features/vpn/monitoring';
import { defineMetricsHandler } from '#server/utils/handler';

export default defineMetricsHandler('json', json);
