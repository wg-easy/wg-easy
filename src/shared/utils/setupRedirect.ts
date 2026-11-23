const accountPages = ['/setup/1', '/setup/2'];
const configurationPages = [
  '/setup/3',
  '/setup/4',
  '/setup/migrate',
  '/login',
  '/login/2fa',
];

export function setupRedirect(pathname: string, step: number) {
  const path = pathname.replace(/\/$/, '');
  if (step === 0) {
    return path === '/setup' || path.startsWith('/setup/') ? '/' : undefined;
  }
  const pages = step === 1 ? accountPages : configurationPages;
  if (!pages.includes(path)) {
    return pages[0];
  }
}
