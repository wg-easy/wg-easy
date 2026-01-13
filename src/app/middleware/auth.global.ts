export default defineNuxtRouteMiddleware(async (to) => {
  // api & setup handled server side
  if (to.path.startsWith('/api/') || to.path.startsWith('/setup')) {
    return;
  }

  const event = useRequestEvent();

  const authStore = useAuthStore();
  authStore.userData = await authStore.getSession(event);

  // skip login if already logged in
  if (to.path === '/login') {
    if (authStore.userData?.username) {
      return navigateTo('/', { redirectCode: 302 });
    }
    return;
  }

  // Require auth for every page other than Login
  if (!authStore.userData?.username) {
    return navigateTo('/login', { redirectCode: 302 });
  }

  // Check for admin access
  if (to.path.startsWith('/admin')) {
    if (!hasPermissions(authStore.userData, 'admin', 'any')) {
      return abortNavigation('Not allowed to access Admin Panel');
    }
  }
});
