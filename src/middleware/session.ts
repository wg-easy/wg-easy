export default defineNuxtRouteMiddleware(async (to) => {
  // TODO: fix api middleware
  if (REQUIRES_PASSWORD || !to.path.startsWith('/api/')) {
    //return abortNavigation();
  }
});
