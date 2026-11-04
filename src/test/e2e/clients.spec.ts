import { expect, test } from './fixtures';
import {
  clientCard,
  createClient,
  downloadConfiguration,
  login,
  reload,
} from './helpers';

test('a downloaded client is applied to WireGuard and disabling or deleting it revokes access', async ({
  page,
  app,
}) => {
  await login(page);
  await createClient(page, 'Smoke client');
  await reload(page);
  const card = clientCard(page, 'Smoke client');
  await expect(card).toBeVisible();

  const { filename, contents } = await downloadConfiguration(page, card);
  expect(filename).toBe('Smoke-client.conf');
  expect(contents).toContain('[Interface]');
  expect(contents).toContain('[Peer]');
  expect(contents).toContain('Endpoint = vpn.example.test:51820');
  expect(contents).toContain(`PublicKey = ${await app.serverPublicKey()}`);
  const privateKey = contents.match(/^PrivateKey = (.+)$/m)?.[1];
  expect(privateKey).toBeTruthy();
  const publicKey = await app.publicKey(privateKey!);
  await expect.poll(app.peers).toContain(publicKey);

  await card.getByRole('switch', { name: 'Disable Client' }).click();
  await expect.poll(app.peers).not.toContain(publicKey);
  await reload(page);
  await expect(
    card.getByRole('switch', { name: 'Enable Client' })
  ).not.toBeChecked();

  await card.getByRole('switch', { name: 'Enable Client' }).click();
  await expect.poll(app.peers).toContain(publicKey);
  await card.getByRole('link', { name: 'Smoke client', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete', exact: true })
    .first()
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete Client', exact: true })
    .click();
  await expect(page).toHaveURL(app.url + '/');
  await expect(clientCard(page, 'Smoke client')).toHaveCount(0);
  await expect.poll(app.peers).not.toContain(publicKey);
  await reload(page);
  await expect(
    page.getByText('There are no clients yet.', { exact: true })
  ).toBeVisible();
  await expect(clientCard(page, 'Smoke client')).toHaveCount(0);
});
