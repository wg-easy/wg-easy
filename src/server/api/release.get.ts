export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const release = Number.parseInt(RELEASE, 10);
  if (isNaN(release)) {
    return 0;
  }
  // TODO: move changelog logic here
  return release;
});
