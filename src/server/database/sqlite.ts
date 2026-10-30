import { drizzle } from 'drizzle-orm/libsql';
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { createDebug } from 'obug';
import { eq } from 'drizzle-orm';

import * as schema from '#db/schema';
import { createStore } from '#db/store';
import type { DBType } from '#db/types';

const DB_DEBUG = createDebug('Database');

export async function connect(options: {
  interfaceName: string;
  disableIpv6: boolean;
}) {
  const client = createClient({ url: 'file:/etc/wireguard/wg-easy.db' });
  const db = drizzle({ client, schema });
  try {
    await migrate(db);
    await renameInterface(db, options.interfaceName);
    if (options.disableIpv6) await disableIpv6(db, options.interfaceName);
    return {
      store: createStore(db, options.interfaceName),
      close: () => client.close(),
    };
  } catch (error) {
    client.close();
    throw error;
  }
}

async function migrate(db: DBType) {
  try {
    DB_DEBUG('Migrating database...');
    await drizzleMigrate(db, {
      migrationsFolder: './server/database/migrations',
    });
    DB_DEBUG('Migration complete');
  } catch (e) {
    if (e instanceof Error) {
      DB_DEBUG('Failed to migrate database:', e.message);
    }
    throw e;
  }
}

// Renames the interface to the one specified in `WG_INTERFACE` then hooks, users, and clients via `ON UPDATE CASCADE`
async function renameInterface(db: DBType, interfaceName: string) {
  const wgInterface = await db.query.wgInterface.findFirst();

  if (!wgInterface) {
    throw new Error('Interface not found');
  }

  if (wgInterface.name === interfaceName) {
    return;
  }

  DB_DEBUG(`Renaming Interface ${wgInterface.name} to ${interfaceName}...`);
  await db
    .update(schema.wgInterface)
    .set({ name: interfaceName })
    .where(eq(schema.wgInterface.name, wgInterface.name));
}

async function disableIpv6(db: DBType, interfaceName: string) {
  // This should match the initial value migration
  const postUpMatch =
    ' ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A FORWARD -i {{interface}} -j ACCEPT; ip6tables -A FORWARD -o {{interface}} -j ACCEPT;';
  const postDownMatch =
    ' ip6tables -t nat -D POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -D FORWARD -i {{interface}} -j ACCEPT; ip6tables -D FORWARD -o {{interface}} -j ACCEPT;';

  await db.transaction(async (tx) => {
    const hooks = await tx.query.hooks.findFirst({
      where: eq(schema.hooks.id, interfaceName),
    });

    if (!hooks) {
      throw new Error('Hooks not found');
    }

    const postUp = hooks.postUp.replace(postUpMatch, '');
    const postDown = hooks.postDown.replace(postDownMatch, '');
    if (postUp === hooks.postUp && postDown === hooks.postDown) {
      DB_DEBUG('IPv6 hooks already disabled, skipping...');
      return;
    }

    DB_DEBUG('Disabling IPv6 hooks...');
    await tx
      .update(schema.hooks)
      .set({ postUp, postDown })
      .where(eq(schema.hooks.id, interfaceName));
  });
}
