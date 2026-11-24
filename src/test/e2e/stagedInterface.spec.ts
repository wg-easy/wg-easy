import { credentials, expect, test } from './fixtures';
import { goto, reload } from './helpers';

test('stages the listener and uplink until restart and replaces their hook-installed rules together', async ({
  app,
  request,
}) => {
  const headers = { Origin: app.url };
  const post = (url: string, data?: object) =>
    request.post(url, { headers, data, failOnStatusCode: true });
  await post('/api/auth/password', { ...credentials, remember: false });
  const iface = '/api/admin/interface';
  const getSettings = async () => (await request.get(iface)).json();
  const settings = await getSettings();
  const installHooks = (tag: string) => {
    const rule = `INPUT -i {{device}} -p udp --dport {{port}} -m comment --comment ${tag} -j ACCEPT`;
    return post('/api/admin/hooks', {
      preUp: '',
      postUp: 'iptables -A ' + rule,
      preDown: 'iptables -D ' + rule,
      postDown: '',
    });
  };
  await installHooks('cutover-old');
  await post(iface + '/restart');
  const rules = () => app.execServer(['iptables', '-S', 'INPUT']);
  const port = () => app.execServer(['wg', 'show', 'wg0', 'listen-port']);
  const oldRule = /-i eth0 .*--dport 51820 .*cutover-old/;
  const newRule = /-i lo .*--dport 51830 .*cutover-new/;
  expect(await rules()).toMatch(oldRule);

  const peer = await post('/api/client', { name: 'Witness', expiresAt: null });
  const url = `/api/client/${(await peer.json()).clientId}/configuration`;
  const download = async () => (await request.get(url)).text();
  await app.connectClient(await download());
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

  await post(iface, { ...settings, port: 51830 });
  expect(await port()).toBe('51820');
  expect(await getSettings()).toMatchObject({
    port: 51830,
    restartRequired: true,
  });
  await post(iface, settings);
  expect((await getSettings()).restartRequired).toBe(false);
  await post(iface, { ...settings, device: 'lo' });
  expect((await getSettings()).restartRequired).toBe(true);
  await post(iface, { ...settings, device: 'lo', port: 51830 });
  await installHooks('cutover-new');
  await post('/api/client', { name: 'Intervening edit', expiresAt: null });
  expect(await port()).toBe('51820');
  expect(await rules()).toMatch(oldRule);
  expect(await rules()).not.toMatch(newRule);
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);
  expect(await download()).toContain('Endpoint = vpn.example.test:51820');
  expect(await app.execServer(['cat', '/etc/wireguard/wg0.conf'])).toContain(
    'ListenPort = 51830'
  );

  await post(iface + '/restart');
  expect(await port()).toBe('51830');
  expect(await rules()).not.toContain('cutover-old');
  expect(await rules()).toMatch(newRule);
  expect((await getSettings()).restartRequired).toBe(false);
  const config = await download();
  expect(config).toContain('Endpoint = vpn.example.test:51820');
  // Connect directly to the new listener. This fixture has no public port forwarder.
  await app.execClient(['wg-quick', 'down', 'wg0']);
  await app.connectClient(
    config.replace('vpn.example.test:51820', 'vpn.example.test:51830')
  );
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
});

test('reloads saved settings and shows Restart required until they match the running interface', async ({
  app,
  page,
}) => {
  await page.request.post('/api/auth/password', {
    headers: { Origin: app.url },
    data: { ...credentials, remember: false },
    failOnStatusCode: true,
  });
  await goto(page, '/admin/interface');
  const port = page.getByLabel('Port', { exact: true });
  const device = page.getByLabel('Device', { exact: true });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  const notice = page.getByText('Restart required', { exact: true });
  await port.fill('51830');
  await device.fill('lo');
  await save.click();
  await expect(notice).toBeVisible();
  await reload(page);
  await expect(port).toHaveValue('51830');
  await expect(device).toHaveValue('lo');
  await expect(notice).toBeVisible();
  await port.fill('51820');
  await device.fill('eth0');
  await save.click();
  await expect(notice).toBeHidden();
});
