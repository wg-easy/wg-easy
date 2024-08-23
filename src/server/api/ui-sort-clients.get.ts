export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const sort = UI_ENABLE_SORT_CLIENTS;
  return sort === 'true' ? true : false;
});
