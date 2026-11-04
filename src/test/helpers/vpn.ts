import fs from 'node:fs/promises';

import { onTestFinished, vi } from 'vitest';

import { databaseFixture } from './database';

import * as schema from '#db/schema';
import { roles } from '#shared/utils/permissions';
import { wg } from '#server/utils/wgHelper';
import { firewall } from '#server/utils/firewall';
vi.mock('#server/utils/config', () => ({
  WG_ENV: { WG_EXECUTABLE: 'wg', PORT: '51821', DISABLE_IPV6: false },
}));

export async function vpnFixture() {
  const { db, store } = await databaseFixture();
  await db.insert(schema.user).values({
    id: 1,
    username: 'admin',
    name: 'Admin',
    role: roles.ADMIN,
    enabled: true,
    totpVerified: false,
  });
  await db.insert(schema.client).values({
    id: 1,
    userId: 1,
    interfaceId: 'wg0',
    name: 'Client',
    ipv4Address: '10.8.0.2',
    ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
    privateKey: 'private',
    publicKey: 'public',
    serverAllowedIps: [],
    persistentKeepalive: 0,
    enabled: true,
  });
  vi.spyOn(wg, 'generatePrivateKey').mockResolvedValue('new-private');
  vi.spyOn(wg, 'getPublicKey').mockResolvedValue('new-public');
  vi.spyOn(wg, 'generatePreSharedKey').mockResolvedValue('new-preshared');
  vi.spyOn(wg, 'dump').mockResolvedValue([]);
  vi.spyOn(wg, 'up').mockResolvedValue('');
  vi.spyOn(wg, 'down').mockResolvedValue('');
  vi.spyOn(wg, 'restart').mockResolvedValue('');
  vi.spyOn(wg, 'sync').mockResolvedValue('');
  vi.spyOn(wg, 'removePeer').mockResolvedValue('');
  const writeConfiguration = vi.spyOn(fs, 'writeFile').mockResolvedValue();
  vi.spyOn(firewall, 'rebuildRules').mockResolvedValue();
  vi.spyOn(firewall, 'blockTraffic').mockResolvedValue();
  vi.spyOn(firewall, 'isAvailable').mockResolvedValue(true);
  vi.spyOn(firewall, 'clearAvailabilityCache').mockImplementation(() => {});
  onTestFinished(() => vi.restoreAllMocks());
  return {
    db,
    store,
    commands: vi.mocked(wg),
    writeConfiguration,
    firewall: vi.mocked(firewall),
  };
}
