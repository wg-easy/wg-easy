export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json');
  // Weird issue with auto import not working. This alias is needed
  const stats = UI_TRAFFIC_STATS;
  return stats === 'true' ? true : false;
});
