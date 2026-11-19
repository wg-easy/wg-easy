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

test('saving a site subnet routes live traffic without interrupting another peer', async ({
  page,
  app,
}) => {
  await login(page);
  const witness = await createClient(page, 'Other peer');
  await app.connectClient(
    (await downloadConfiguration(page, witness)).contents
  );
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

  const site = await createClient(page, 'Site gateway');
  await app.connectClient(
    (await downloadConfiguration(page, site)).contents,
    2
  );
  const host = '192.168.120.1';
  await app.execClient(['ip', 'address', 'add', host + '/32', 'dev', 'lo'], 2);
  await app.execClient(['ping', '-c', '1', '-W', '3', '10.8.0.1'], 2);

  const edit = () =>
    site.getByRole('link', { name: 'Site gateway', exact: true }).click();
  const routes = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Server Allowed IPs' }) });
  const save = async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(app.url + '/');
  };
  const lookup = () => app.execServer(['ip', '-4', 'route', 'get', host]);
  const ifindex = () => app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
  const before = await ifindex();
  await edit();
  await routes.getByRole('button', { name: 'Add' }).click();
  await routes.getByRole('textbox').fill('192.168.120.0/22');

  const traffic = app.execClient([
    'ping',
    '-c',
    '25',
    '-i',
    '0.2',
    '-I',
    'wg0',
    '10.8.0.1',
  ]);
  await save();
  expect(await lookup()).toContain('dev wg0');
  await app.execServer(['ping', '-c', '1', '-W', '2', host]);

  await edit();
  await routes.getByRole('button', { name: 'Delete' }).click();
  await save();
  expect(await lookup()).not.toContain('dev wg0');
  expect(await ifindex()).toBe(before);
  expect(await traffic).toContain(', 0% packet loss');
});

test('reports a route conflict and withdraws the site route after a restart', async ({
  page,
  app,
}) => {
  await login(page);
  const card = await createClient(page, 'Branch office');
  const prefix = '192.168.120.0/22';
  const readRoute = () =>
    app.execServer(['ip', 'route', 'show', 'exact', prefix]);
  await app.execServer(['ip', 'route', 'add', prefix, 'dev', 'eth0']);
  await card.getByRole('link', { name: 'Branch office', exact: true }).click();
  const routes = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Server Allowed IPs' }) });
  await routes.getByRole('button', { name: 'Add' }).click();
  await routes.getByRole('textbox').fill(prefix);
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await save.click();
  await expect(
    page.getByText(/Settings saved\. Could not install 192\.168\.120\.0\/22/)
  ).toBeVisible();
  expect(await readRoute()).toContain('dev eth0');
  await app.execServer(['ip', 'route', 'del', prefix, 'dev', 'eth0']);
  await save.click();
  await expect.poll(readRoute).toContain('dev wg0');

  await page.goto('about:blank');
  const url = await app.restart();
  await page.context().clearCookies();
  await login(page, url + '/login');
  expect(await readRoute()).toContain('dev wg0');
  await card.getByRole('switch', { name: 'Disable Client' }).click();
  await expect.poll(readRoute).toBe('');
});
