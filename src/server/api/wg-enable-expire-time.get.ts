export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const expires = WG_ENABLE_EXPIRES_TIME;
  return expires === 'true' ? true : false;
});
