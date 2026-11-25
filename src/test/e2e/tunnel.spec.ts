import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { createClient, downloadConfiguration, login } from './helpers';

const siteSubnet = '192.168.120.0/22';

function serverAllowedIps(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Server Allowed IPs' }),
  });
}

async function addSiteSubnet(page: Page, prefix = siteSubnet) {
  const routes = serverAllowedIps(page);
  await routes.getByRole('button', { name: 'Add', exact: true }).click();
  await routes.getByRole('textbox').last().fill(prefix);
}

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
  const save = async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(app.url + '/');
  };
  const lookup = () => app.execServer(['ip', '-4', 'route', 'get', host]);
  const ifindex = () => app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
  const before = await ifindex();
  await edit();
  await addSiteSubnet(page);

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
  await serverAllowedIps(page).getByRole('button', { name: 'Delete' }).click();
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
  const readRoute = () =>
    app.execServer(['ip', 'route', 'show', 'exact', siteSubnet]);
  await app.execServer(['ip', 'route', 'add', siteSubnet, 'dev', 'eth0']);
  await card.getByRole('link', { name: 'Branch office', exact: true }).click();
  await addSiteSubnet(page);
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await save.click();
  await expect(
    page
      .getByRole('region', { name: /Notifications/ })
      .getByRole('listitem')
      .getByText(`Settings saved. Could not install ${siteSubnet}`)
  ).toBeVisible();
  expect(await readRoute()).toContain('dev eth0');
  await app.execServer(['ip', 'route', 'del', siteSubnet, 'dev', 'eth0']);
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

for (const backend of ['wg', 'awg'] as const) {
  test.describe(`${backend} site-routed hooks`, () => {
    test.use({ backend });
    test('a partially failed PostUp stays down until an administrator restarts it', async ({
      request,
      api: { post, headers, create, download, json },
      app,
    }) => {
      const clientUrl = await create('Office router');
      const peer = await json(clientUrl);
      const hookRoute = '10.8.0.77/32';
      const siteHost = '192.168.120.1';
      await app.connectClient(await download(clientUrl));
      await app.execClient([
        'ip',
        'addr',
        'add',
        siteHost + '/32',
        'dev',
        'lo',
      ]);
      const port = await app.execClient([
        backend,
        'show',
        'wg0',
        'listen-port',
      ]);
      await post(clientUrl, {
        ...peer,
        serverEndpoint: `vpn-client:${port}`,
        serverAllowedIps: [siteSubnet, hookRoute],
      });

      const hooksUrl = '/api/admin/hooks';
      const restartUrl = '/api/admin/interface/restart';
      const attempts = '/tmp/post-up-attempts';
      const hooks = {
        preUp: '',
        postUp: `echo run >> ${attempts}; false | true`,
        preDown: `if [[ -f ${attempts} ]]; then echo PreDown >> ${attempts}; fi`,
        postDown: `if [[ -f ${attempts} ]]; then echo PostDown >> ${attempts}; fi`,
      };
      await post(hooksUrl, hooks);
      const failed = await request.post(restartUrl, { headers });
      expect(failed.status()).toBe(503);
      expect((await failed.json()).message).toContain('PostUp failed');
      expect(await app.execServer([backend, 'show', 'interfaces'])).toBe('');
      expect(
        await app.execServer(['ip', 'route', 'show', 'exact', siteSubnet])
      ).toBe('');
      const readAttempts = () => app.read(attempts);
      expect(await readAttempts()).toBe('run');
      // The preferred tunnel route may coexist with an operator's backup route.
      await app.execServer([
        'ip',
        'route',
        'add',
        siteSubnet,
        'dev',
        'eth0',
        'metric',
        '500',
      ]);

      const fixed = {
        ...hooks,
        postUp: [
          'test "$CONFIG_FILE" = /etc/wireguard/wg0.conf',
          `grep '^AllowedIPs = .*${siteSubnet}' "$CONFIG_FILE"`,
          'test "$INTERFACE" = {{interface}}',
          'test "$TABLE" = auto',
          `ping -c 1 -W 4 ${siteHost}`,
          `ip route add ${hookRoute} dev %i`,
          `cmd echo office#lan "hq #1" >> ${attempts} # trailing comment`,
          `echo ready >> ${attempts}`,
        ].join(';\n'),
      };
      // The corrected hook is saved. Applying it requires an explicit restart.
      expect(
        (await request.post(hooksUrl, { headers, data: fixed })).status()
      ).toBe(503);
      const savedHook = await app.execServer([
        'grep',
        '^PostUp =',
        '/etc/wireguard/wg0.conf',
      ]);
      expect(savedHook).toContain('echo ready');
      expect(await readAttempts()).toBe('run');
      await post(restartUrl);
      expect(await readAttempts()).toBe('run\noffice#lan hq #1\nready');
      expect(await app.execServer([backend, 'show', 'interfaces'])).toBe('wg0');

      const iface = '/api/admin/interface';
      await post(iface, { ...(await json(iface)), firewallEnabled: true });
      const localTarget = '192.0.2.99';
      await app.execServer([
        'ip',
        'addr',
        'add',
        localTarget + '/32',
        'dev',
        'lo',
      ]);
      await post(clientUrl, {
        ...(await json(clientUrl)),
        firewallIps: ['10.8.0.1/32'],
      });
      await post(hooksUrl, {
        ...fixed,
        postUp: [
          `ping -c 1 -W 4 ${peer.ipv4Address}`,
          `ip route add ${hookRoute} dev %i`,
          'iptables -I INPUT 1 -i %i -m comment --comment site-hook -j ACCEPT',
          'iptables -D FORWARD -i %i -j WG_CLIENTS_%i',
          'iptables -F WG_CLIENTS_%i',
        ].join('; '),
      });
      await post(restartUrl);

      expect(await app.pingFromClient('10.8.0.1')).toBe(true);
      expect(await app.pingFromClient(localTarget)).toBe(false);
      expect(await app.execServer(['iptables', '-S', 'INPUT'])).toContain(
        'site-hook'
      );
      expect(await app.execServer(['iptables', '-S', 'FORWARD'])).toContain(
        '-i wg0 -j WG_CLIENTS_wg0'
      );

      expect(
        await app.execServer(['ip', 'route', 'show', 'exact', siteSubnet])
      ).toContain('dev wg0');
      await post(clientUrl + '/disable');
      const remaining = await app.execServer([
        'ip',
        'route',
        'show',
        'exact',
        siteSubnet,
      ]);
      expect(remaining).toMatch(/dev eth0.*metric 500/);
      expect(remaining).not.toContain('dev wg0');
      expect(
        await app.execServer(['ip', 'route', 'show', 'exact', hookRoute])
      ).toContain('dev wg0');
    });
  });
}

test('starts with a site conflict, preserves hook and backup routes, and retries live', async ({
  page,
  app,
}) => {
  test.slow(); // Exercise the real one-minute maintenance timer.
  await login(page);
  const healthy = await createClient(page, 'Healthy peer');
  const peerConfig = (await downloadConfiguration(page, healthy)).contents;
  const site = await createClient(page, 'Office LAN');
  await site.getByRole('link', { name: 'Office LAN', exact: true }).click();
  const backup = '192.0.2.0/24';
  const manual = '10.8.0.77/32';
  const ipv6 = '2001:db8:42::/64';
  for (const prefix of [siteSubnet, backup, manual, ipv6]) {
    await addSiteSubnet(page, prefix);
  }
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(app.url + '/');

  const saved = await page.request.post(app.url + '/api/admin/hooks', {
    headers: { Origin: app.url },
    data: {
      preUp: `ip route replace ${siteSubnet} dev eth0; ip route replace ${backup} dev eth0 metric 500`,
      postUp: `ip route get 192.0.2.1 | grep -q "dev %i"; ip -4 route add ${manual} dev %i # office`,
      preDown: '',
      postDown: '',
    },
  });
  expect(saved.ok()).toBe(true);

  await page.goto('about:blank');
  const url = await app.restart();
  await page.context().clearCookies();
  await login(page, url + '/login');
  await app.connectClient(peerConfig);
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

  const read = (prefix: string) =>
    app.execServer(['ip', '-4', 'route', 'show', 'exact', prefix]);
  expect(await read(siteSubnet)).toContain('dev eth0');
  expect(await read(backup)).toContain('dev wg0');
  expect(await read(backup)).toMatch(/\bdev eth0\b[^\n]*\bmetric 500\b/);
  expect(await read(manual)).toContain('dev wg0');
  expect(await app.show('allowed-ips')).not.toContain(ipv6);
  expect(
    await app.execServer(['ip', '-6', 'route', 'show', 'exact', ipv6])
  ).toBe('');

  const ifindex = () => app.read('/sys/class/net/wg0/ifindex');
  const before = await ifindex();
  await app.execServer(['ip', 'route', 'del', siteSubnet, 'dev', 'eth0']);
  await expect
    .poll(() => read(siteSubnet), { timeout: 75_000, intervals: [1000] })
    .toContain('dev wg0');
  expect(await ifindex()).toBe(before);
  await site.getByRole('switch', { name: 'Disable Client' }).click();
  await expect.poll(() => read(siteSubnet)).toBe('');
  expect(await read(backup)).not.toContain('dev wg0');
  expect(await read(backup)).toMatch(/\bdev eth0\b[^\n]*\bmetric 500\b/);
  expect(await read(manual)).toContain('dev wg0');
});
