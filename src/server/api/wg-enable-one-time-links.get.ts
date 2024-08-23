export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const otl = WG_ENABLE_ONE_TIME_LINKS;
  return otl === 'true' ? true : false;
});
