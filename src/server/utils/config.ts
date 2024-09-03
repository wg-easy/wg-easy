import debug from 'debug';

export const UI_TRAFFIC_STATS = process.env.UI_TRAFFIC_STATS || 'false';
export const UI_CHART_TYPE = process.env.UI_CHART_TYPE || '0';
export const WG_ENABLE_ONE_TIME_LINKS =
  process.env.WG_ENABLE_ONE_TIME_LINKS || 'false';
export const UI_ENABLE_SORT_CLIENTS =
  process.env.UI_ENABLE_SORT_CLIENTS || 'false';
export const WG_ENABLE_EXPIRES_TIME =
  process.env.WG_ENABLE_EXPIRES_TIME || 'false';
export const ENABLE_PROMETHEUS_METRICS =
  process.env.ENABLE_PROMETHEUS_METRICS || 'false';
export const PROMETHEUS_METRICS_PASSWORD =
  process.env.PROMETHEUS_METRICS_PASSWORD;

export const REQUIRES_PROMETHEUS_PASSWORD = !!PROMETHEUS_METRICS_PASSWORD;

export const SERVER_DEBUG = debug('Server');
