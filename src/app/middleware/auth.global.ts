import { setupRedirect } from '#shared/utils/setupRedirect';

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/api/')) {
    return;
  }

  const event = useRequestEvent();
  const setupStore = useSetupStore();
  const step = setupStore.done
    ? 0
    : (event?.context.setupStep ?? (await $fetch('/api/setup/status')).step);
  setupStore.done = step === 0;
  const redirect = setupRedirect(to.path, step);
  if (redirect) {
    return navigateTo(redirect, { redirectCode: 302 });
  }
  if (step === 1) {
    return;
  }

  const authStore = useAuthStore();
  authStore.userData = await authStore.getSession(event);

  const isLoginRoute = /^\/login(?:\/2fa)?\/?$/.test(to.path);

  // skip login pages if already logged in
  if (isLoginRoute) {
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
  if (to.path.startsWith('/admin') || to.path.startsWith('/setup/')) {
    if (!hasPermissions(authStore.userData, 'admin', 'any')) {
      return abortNavigation(
        createError({
          statusCode: 403,
          statusMessage: 'Administrator access required',
        })
      );
    }
  }
});
