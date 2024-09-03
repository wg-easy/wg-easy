export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  // TODO: enable by default
  return MAX_AGE > 0;
});
