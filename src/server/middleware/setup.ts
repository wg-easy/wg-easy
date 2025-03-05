/* First setup of wg-easy */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  // User can't be logged in, and public routes can be accessed whenever
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  const { step, done } = await Database.general.getSetupStep();
  if (!done) {
    const parsedSetup = url.pathname.match(/\/setup\/(\d)/);
    if (!parsedSetup) {
      return sendRedirect(event, `/setup/1`, 302);
    }
    const [_, currentSetup] = parsedSetup;

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
