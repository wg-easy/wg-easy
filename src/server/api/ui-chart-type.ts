import { UI_CHART_TYPE } from '~/utils/config';

export default defineEventHandler((event) => {
  assertMethod(event, 'GET');
  setHeader(event, 'Content-Type', 'application/json');
  return `"${UI_CHART_TYPE}"`;
});
