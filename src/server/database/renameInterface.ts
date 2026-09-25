import { access } from 'node:fs/promises';

import type { Client } from '@libsql/client';
import { eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { createDebug } from 'obug';

import * as schema from '#db/schema';
import { parseInterfaceName } from '#server/utils/interfaceName';

const DB_DEBUG = createDebug('Database');

export type RenameDatabase = LibSQLDatabase<typeof schema>;

/**
 * `wg-quick down` on a name that was never brought up.
 * First boot, and a rename whose old device is already gone, hit this.
 */
export function isAbsentWireGuardInterface(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /not a WireGuard interface|Cannot find device|No such device|does not exist/i.test(
    message
  );
}

/**
 * Point the stored interface at `nextName`.
 *
 * Child rows (hooks, user config, clients) use ON UPDATE CASCADE, which
 * SQLite only applies when foreign keys are enabled on this connection.
 * The previous device is taken down before the rename is committed so a
 * host-network restart does not leave the old interface holding the port.
 * Returns without doing either when the name is already `nextName`.
 */
export async function interfaceConfigExists(name: string): Promise<boolean> {
  if (!isStoredInterfaceName(name)) {
    return false;
  }

  try {
    await access(`/etc/wireguard/${name}.conf`);
    return true;
  } catch {
    return false;
  }
}

function isStoredInterfaceName(name: string): boolean {
  try {
    return parseInterfaceName(name) === name;
  } catch {
    return false;
  }
}

export async function prepareInterfaceRename(
  client: Client,
  db: RenameDatabase,
  nextName: string,
  down: (name: string) => Promise<unknown>,
  configExists: (name: string) => Promise<boolean> = interfaceConfigExists
): Promise<void> {
  const current = await db.query.wgInterface.findFirst();

  if (!current) {
    throw new Error('Interface not found');
  }

  if (current.name === nextName) {
    return;
  }

  DB_DEBUG(`Renaming Interface ${current.name} to ${nextName}...`);

  // A new database is seeded as wg0. Another container on the host may
  // already be using that device. Only stop an interface this instance
  // has written a config for.
  if (await configExists(current.name)) {
    try {
      await down(current.name);
    } catch (err) {
      if (!isAbsentWireGuardInterface(err)) {
        throw err;
      }
    }
  }

  // libsql enables foreign keys by default. Set it here so ON UPDATE CASCADE
  // still runs if that default changes. SQLite itself leaves the pragma off.
  await client.execute('PRAGMA foreign_keys = ON');

  await db
    .update(schema.wgInterface)
    .set({ name: nextName })
    .where(eq(schema.wgInterface.name, current.name))
    .execute();
}
