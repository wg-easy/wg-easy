import { credentials, expect, test } from './fixtures';
import { goto, login, reload } from './helpers';

test('password authentication survives reload and logout removes access', async ({
  page,
}) => {
  await goto(page, '/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Username', { exact: true }).fill(credentials.username);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  const rejected = page.waitForResponse('/api/auth/password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await rejected).status()).toBe(401);
  expect((await page.request.get('/api/client')).status()).toBe(401);
  await expect(page).toHaveURL(/\/login$/);

  await login(page);
  await reload(page);
  await expect(
    page.getByRole('heading', { name: 'Clients', exact: true })
  ).toBeVisible();
  expect((await page.request.get('/api/client')).status()).toBe(200);

  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get('/api/client')).status()).toBe(401);
  await goto(page, '/');
  await expect(page).toHaveURL(/\/login$/);
});
