import fs from 'node:fs/promises';

import { onTestFinished, vi } from 'vitest';

import { databaseFixture } from './database';

import * as schema from '#db/schema';
import { roles } from '#shared/utils/permissions';
import * as recovery from '#server/features/vpn/tunnelRecord';
import * as cmd from '#server/utils/cmd';
import { LinuxTunnel } from '#server/utils/linuxTunnel';
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
  vi.spyOn(wg, 'generateKeyPair').mockResolvedValue({
    privateKey: 'new-private',
    publicKey: 'new-public',
  });
  vi.spyOn(wg, 'generatePreSharedKey').mockResolvedValue('new-preshared');
  vi.spyOn(wg, 'dump').mockResolvedValue([]);
  const up = vi.spyOn(LinuxTunnel.prototype, 'create').mockResolvedValue();
  const down = vi.spyOn(LinuxTunnel.prototype, 'stop').mockResolvedValue();
  let failedName: string | undefined;
  vi.spyOn(recovery, 'readPostUpMarker').mockImplementation(async () =>
    failedName ? { name: failedName, succeeded: false } : undefined
  );
  vi.spyOn(recovery, 'writeHookMarker').mockImplementation(async (name) => {
    failedName = name;
  });
  vi.spyOn(recovery, 'clearPostUpFailure').mockImplementation(async () => {
    failedName = undefined;
  });
  vi.spyOn(LinuxTunnel.prototype, 'checkOwnership').mockResolvedValue(
    undefined
  );
  vi.spyOn(LinuxTunnel.prototype, 'armDownHooks').mockImplementation(() => {});
  vi.spyOn(LinuxTunnel.prototype, 'configureLink').mockResolvedValue(undefined);
  vi.spyOn(cmd, 'exec').mockResolvedValue('');
  vi.spyOn(wg, 'runHook').mockResolvedValue('');
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
    commands: { ...vi.mocked(wg), up, down },
    writeConfiguration,
    firewall: vi.mocked(firewall),
  };
}
