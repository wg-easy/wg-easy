import { generateKeyPairSync } from 'node:crypto';

import { expect, test } from './fixtures';
import {
  clientCard,
  createClient,
  downloadConfiguration,
  login,
  reload,
} from './helpers';

test('a device-held key connects using the template and can be replaced', async ({
  page,
  app,
}) => {
  const device = generateKeyPairSync('x25519').privateKey.export({
    format: 'jwk',
  });
  const publicKey = Buffer.from(device.x!, 'base64url').toString('base64');
  await login(page);
  const card = await createClient(page, 'Router', publicKey);
  await expect(card.getByRole('button', { name: 'Show QR Code' })).toHaveCount(
    0
  );
  const { filename, contents } = await downloadConfiguration(page, card);
  expect(filename).toBe('Router.template.conf');
  expect(contents).not.toMatch(/^PrivateKey =/m);
  const privateKey = Buffer.from(device.d!, 'base64url').toString('base64');
  await app.connectClient(
    contents.replace(/^# PrivateKey = .*$/m, `PrivateKey = ${privateKey}`)
  );
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

  await card.getByRole('link', { name: 'Router', exact: true }).click();
  await expect(page).toHaveURL(/\/clients\/\d+$/);
  const clientId = page.url().split('/').at(-1)!;
  await expect(
    app.execServer(['cli', 'clients:qr', clientId])
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('configuration template'),
  });
  await page
    .getByRole('button', { name: 'View configuration template' })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText('# PrivateKey =');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Replace Public Key' })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  const replacement = generateKeyPairSync('x25519').publicKey.export({
    format: 'jwk',
  });
  const newKey = Buffer.from(replacement.x!, 'base64url').toString('base64');
  await dialog.getByLabel('Public Key', { exact: true }).fill(newKey);
  await dialog.getByRole('button', { name: 'Replace Public Key' }).click();
  await expect.poll(app.peers).toEqual([newKey]);
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(false);
});

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
