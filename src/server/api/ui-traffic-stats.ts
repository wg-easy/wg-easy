export default defineEventHandler((event) => {
  assertMethod(event, 'GET');
  setHeader(event, 'Content-Type', 'application/json');
  return `"${UI_TRAFFIC_STATS}"`;
});
