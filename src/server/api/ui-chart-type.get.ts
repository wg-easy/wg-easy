export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json');
  return `"${UI_CHART_TYPE}"`;
});
