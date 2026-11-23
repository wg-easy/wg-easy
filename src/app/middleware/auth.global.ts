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
  if (import.meta.client) {
    const redirect = setupRedirect(to.path, step);
    if (redirect) {
      return navigateTo(redirect);
    }
  }
  if (step === 1) {
    return;
  }

  const authStore = useAuthStore();
  authStore.userData = await authStore.getSession(event);

  const path = to.path.replace(/\/$/, '');
  if (path === '/login' || path === '/login/2fa') {
    if (authStore.userData) {
      return navigateTo(setupStore.done ? '/' : '/setup/3');
    }
    return;
  }

  if (!authStore.userData) {
    return navigateTo('/login');
  }

  if (
    (path.startsWith('/admin') || path.startsWith('/setup/')) &&
    !hasPermissions(authStore.userData, 'admin', 'any')
  ) {
    return abortNavigation(
      createError({
        statusCode: 403,
        statusMessage: 'Administrator access required',
      })
    );
  }
});
