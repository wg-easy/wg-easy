/* First setup of wg-easy app */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  // User can't be logged in, and public routes can be accessed whenever
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  const setupDone = await Database.setup.done();
  if (!setupDone) {
    const parsedSetup = url.pathname.match(/\/setup\/(\d)/);
    if (!parsedSetup) {
      return sendRedirect(event, `/setup/1`, 302);
    }
    const [_, currentSetup] = parsedSetup;
    const step = await Database.setup.get();
    if (step.toString() === currentSetup) {
      return;
    }
    return sendRedirect(event, `/setup/${step}`, 302);
  } else {
    // If already set up
    if (!url.pathname.startsWith('/setup/')) {
      return;
    }
    return sendRedirect(event, '/login', 302);
  }
});
