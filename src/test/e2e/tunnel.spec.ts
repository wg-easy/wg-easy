import { expect, test } from './fixtures';
import { createClient, downloadConfiguration, login } from './helpers';

test('a downloaded configuration carries traffic only while the client is enabled', async ({
  page,
  app,
}) => {
  await login(page);
  const card = await createClient(page, 'Tunnel client');
  const { contents } = await downloadConfiguration(page, card);
  await app.connectClient(contents);

  const canReachServer = () => app.pingFromClient('10.8.0.1');
  await expect.poll(canReachServer).toBe(true);

  await card.getByRole('switch', { name: 'Disable Client' }).click();
  await expect.poll(canReachServer).toBe(false);

  await card.getByRole('switch', { name: 'Enable Client' }).click();
  // The existing client needs a new handshake after its peer is re-added.
  await expect.poll(canReachServer, { timeout: 30_000 }).toBe(true);
});
