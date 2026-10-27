import { expect, test } from 'vitest';

import { databaseFixture } from '../helpers/database';

import * as schema from '#db/schema';
import { createStore } from '#db/store';

test('scopes configuration reads and updates to the selected interface', async () => {
  const { db, store } = await databaseFixture();
  const network = await store.interfaces.get();
  const hooks = await store.hooks.get();
  const defaults = await store.userConfigs.get();
  await db.insert(schema.wgInterface).values({
    ...network,
    name: 'wg1',
    port: 51900,
  });
  await db.insert(schema.hooks).values({ ...hooks, id: 'wg1' });
  await db.insert(schema.userConfig).values({ ...defaults, id: 'wg1' });

  const other = createStore(db, 'wg1');
  await other.transaction(async (tx) => {
    await tx.interfaces.update({ firewallEnabled: true, mtu: 1400 });
    await tx.hooks.update({ postUp: "echo 'VPN started'" });
    await tx.userConfigs.update({
      defaultDns: ['1.1.1.1', '2606:4700:4700::1111'],
      defaultGeneratePreSharedKey: false,
      defaultMtu: null,
    });
  });

  expect(await other.interfaces.get()).toMatchObject({
    name: 'wg1',
    port: 51900,
    firewallEnabled: true,
    mtu: 1400,
  });
  expect(await other.hooks.get()).toMatchObject({
    id: 'wg1',
    postUp: "echo 'VPN started'",
  });
  expect(await other.userConfigs.get()).toMatchObject({
    id: 'wg1',
    defaultDns: ['1.1.1.1', '2606:4700:4700::1111'],
    defaultGeneratePreSharedKey: false,
    defaultMtu: null,
  });
  expect(await store.interfaces.get()).toEqual(network);
  expect(await store.hooks.get()).toEqual(hooks);
  expect(await store.userConfigs.get()).toEqual(defaults);
});
