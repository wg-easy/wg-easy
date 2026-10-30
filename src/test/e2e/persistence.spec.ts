import { expect, test } from './fixtures';
import {
  clientCard,
  createClient,
  downloadConfiguration,
  login,
} from './helpers';

test('restarting preserves credentials, client keys and disabled access', async ({
  page,
  app,
}) => {
  await login(page);
  const card = await createClient(page, 'Persistent client');
  const before = await downloadConfiguration(page, card);
  const serverKey = await app.serverPublicKey();
  const privateKey = before.contents.match(/^PrivateKey = (.+)$/m)?.[1];
  expect(privateKey).toBeTruthy();
  const publicKey = await app.publicKey(privateKey!);
  await expect.poll(app.peers).toContain(publicKey);
  await card.getByRole('switch', { name: 'Disable Client' }).click();
  await expect.poll(app.peers).not.toContain(publicKey);

  // Stop browser polling so restart errors cannot interfere with UI assertions.
  await page.goto('about:blank');
  const restartedUrl = await app.restart();
  await page.context().clearCookies();
  await login(page, `${restartedUrl}/login`);

  const restored = clientCard(page, 'Persistent client');
  await expect(
    restored.getByRole('switch', { name: 'Enable Client' })
  ).not.toBeChecked();
  expect(await downloadConfiguration(page, restored)).toEqual(before);
  expect(await app.serverPublicKey()).toBe(serverKey);
  expect(await app.peers()).not.toContain(publicKey);
  await restored.getByRole('switch', { name: 'Enable Client' }).click();
  await expect.poll(app.peers).toContain(publicKey);
});
