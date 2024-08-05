export default defineNuxtRouteMiddleware(async (to) => {
  if (REQUIRES_PASSWORD || !to.path.startsWith('/api/')) {
    return abortNavigation();
  }
});
