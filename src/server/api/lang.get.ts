export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  return Database.getLang();
});
