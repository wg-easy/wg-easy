export default defineNuxtRouteMiddleware(async (to, from) => {
    if (REQUIRES_PASSWORD || !to.path.startsWith('/api/')) {
        return abortNavigation();
    }
  })