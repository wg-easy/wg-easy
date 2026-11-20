/** The persisted step identifies which pages can be revisited on a fresh request. */
export function setupRedirect(path: string, step: number) {
  path = path.replace(/\/$/, '');
  if (step === 0) {
    if (path === '/setup' || path.startsWith('/setup/')) {
      return '/';
    }
    return;
  }
  if (step === 1) {
    if (path !== '/setup/1' && path !== '/setup/2') {
      return '/setup/1';
    }
    return;
  }
  if (
    ![
      '/login',
      '/login/2fa',
      '/setup/3',
      '/setup/4',
      '/setup/migrate',
    ].includes(path)
  ) {
    return '/setup/3';
  }
}
