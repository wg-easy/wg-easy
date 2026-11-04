import { credentials, expect, test } from './fixtures';
import { goto, login } from './helpers';

test.use({ initialized: false });

test('a fresh installation can be configured once through the setup wizard', async ({
  page,
}) => {
  await goto(page, '/');
  await expect(page).toHaveURL(/\/setup\/1$/);
  await page.getByRole('link', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill(credentials.username);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page
    .getByLabel('Confirm Password', { exact: true })
    .fill(credentials.password);
  await page
    .getByRole('button', { name: 'Create Account', exact: true })
    .click();
  await page.getByRole('link', { name: 'No', exact: true }).click();
  await page.getByLabel('Host', { exact: true }).fill('vpn.example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('link', { name: 'Sign In', exact: true }).click();
  await login(page);

  const repeated = await page.request.post('/api/setup/2', {
    data: {
      username: 'replacement-admin',
      password: credentials.password,
      confirmPassword: credentials.password,
    },
  });
  expect(repeated.status()).toBe(400);
  const session = await page.request.get('/api/session');
  expect(await session.json()).toMatchObject({
    username: credentials.username,
  });
  await goto(page, '/setup/1');
  await expect(
    page.getByRole('heading', { name: 'Clients', exact: true })
  ).toBeVisible();
});
