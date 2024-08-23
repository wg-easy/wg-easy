export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  return MAX_AGE > 0;
});
