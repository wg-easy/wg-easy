export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const number = Number.parseInt(UI_CHART_TYPE, 10);
  if (Number.isNaN(number)) {
    return 0;
  }
  return number;
});
