export default defineNuxtRouteMiddleware(async (to) => {
  // api & setup handled server side
  if (to.path.startsWith('/api/') || to.path.startsWith('/setup')) {
    return;
  }

  const authStore = useAuthStore();
  const userData = await authStore.getSession();

  // skip login if already logged in
  if (to.path === '/login') {
    if (userData?.username) {
      return navigateTo('/', { redirectCode: 302 });
    }
    return;
  }

  // Require auth for every page other than Login
  if (!userData?.username) {
    return navigateTo('/login', { redirectCode: 302 });
  }

  // Check for admin access
  if (to.path.startsWith('/admin')) {
    if (!hasPermissions(userData, 'admin', 'any')) {
      return abortNavigation('Not allowed to access Admin Panel');
    }
  }
});
