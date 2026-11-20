import type { Page } from '@playwright/test';

import { credentials, expect, test } from './fixtures';
import { goto, reload } from './helpers';

test.use({ initialized: false });

async function claimAndSignIn(page: Page) {
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
  await expect(page).toHaveURL(/\/login$/);
  await goto(page, '/setup/migrate');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Username', { exact: true }).fill(credentials.username);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/3$/);
}

test('a fresh installation can be configured once through the setup wizard', async ({
  page,
}) => {
  await claimAndSignIn(page);
  await page.getByRole('link', { name: 'No', exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/4$/);
  await reload(page);
  await page.getByLabel('Host', { exact: true }).fill('vpn.example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Clients', exact: true })
  ).toBeVisible();

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

test('an administrator can correct a v14 backup and reach the dashboard', async ({
  page,
  app,
}) => {
  await claimAndSignIn(page);
  await page.getByRole('link', { name: 'Yes', exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/migrate$/);
  await reload(page);
  const privateKey = await app.execServer(['wg', 'genkey']);
  const publicKey = await app.publicKey(privateKey);
  const upload = async (key: string) => {
    const file = {
      server: { privateKey, publicKey: key, address: '10.9.0.15' },
      clients: {},
    };
    await page.locator('#migration').setInputFiles({
      name: 'wg0.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(file)),
    });
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
  };
  await upload('invalid');
  await expect(
    page.getByText('Invalid backup field: server.publicKey', { exact: true })
  ).toBeVisible();
  await upload(publicKey);
  await expect(
    page.getByRole('heading', { name: 'Clients', exact: true })
  ).toBeVisible();
  expect(await app.serverPublicKey()).toBe(publicKey);
  await goto(page, '/setup/migrate');
  await expect(page).toHaveURL(/\/$/);
});
