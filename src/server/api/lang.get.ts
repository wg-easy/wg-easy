import useDatabase from '~/composables/useDatabase';

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const db = useDatabase();
  return db.getLang();
});
