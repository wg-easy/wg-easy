import fs from 'node:fs/promises';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { createDebug } from 'obug';
import { eq } from 'drizzle-orm';

import * as schema from './schema';
import { ClientService } from './repositories/client/service';
import { GeneralService } from './repositories/general/service';
import { UserService } from './repositories/user/service';
import { UserConfigService } from './repositories/userConfig/service';
import { InterfaceService } from './repositories/interface/service';
import { HooksService } from './repositories/hooks/service';
import { OneTimeLinkService } from './repositories/oneTimeLink/service';

const DB_DEBUG = createDebug('Database');

await fs.mkdir(WG_ENV.STATE_DIR, { recursive: true, mode: 0o700 });

const client = createClient({ url: `file:${WG_ENV.STATE_DIR}/wg-easy.db` });
const db = drizzle({ client, schema });

export async function connect() {
  await migrate();
  await normalizeInterfaceName(db);
  const dbService = new DBService(db);

  if (WG_INITIAL_ENV.ENABLED) {
    await initialSetup(dbService);
  }

  await applyRuntimeInterfaceConfig(db);
  await applyNixClientDefaults(db);

  if (WG_ENV.DISABLE_IPV6) {
    DB_DEBUG('Warning: Disabling IPv6...');
    await disableIpv6(db);
  }

  return dbService;
}

class DBService {
  clients: ClientService;
  general: GeneralService;
  users: UserService;
  userConfigs: UserConfigService;
  interfaces: InterfaceService;
  hooks: HooksService;
  oneTimeLinks: OneTimeLinkService;

  constructor(db: DBType) {
    this.clients = new ClientService(db);
    this.general = new GeneralService(db);
    this.users = new UserService(db);
    this.userConfigs = new UserConfigService(db);
    this.interfaces = new InterfaceService(db);
    this.hooks = new HooksService(db);
    this.oneTimeLinks = new OneTimeLinkService(db);
  }
}

export type DBType = typeof db;
export type DBServiceType = DBService;

async function migrate() {
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
  }
}

async function initialSetup(db: DBServiceType) {
  const setup = await db.general.getSetupStep();

  if (setup.done) {
    DB_DEBUG('Setup already done. Skiping initial setup.');
    return;
  }

  if (WG_INITIAL_ENV.IPV4_CIDR && WG_INITIAL_ENV.IPV6_CIDR) {
    DB_DEBUG('Setting initial CIDR...');
    await db.interfaces.updateCidr({
      ipv4Cidr: WG_INITIAL_ENV.IPV4_CIDR,
      ipv6Cidr: WG_INITIAL_ENV.IPV6_CIDR,
    });
  }

  if (WG_INITIAL_ENV.DNS) {
    DB_DEBUG('Setting initial DNS...');
    await db.userConfigs.update({
      defaultDns: WG_INITIAL_ENV.DNS,
    });
  }

  if (WG_INITIAL_ENV.ALLOWED_IPS) {
    DB_DEBUG('Setting initial Allowed IPs...');
    await db.userConfigs.update({
      defaultAllowedIps: WG_INITIAL_ENV.ALLOWED_IPS,
    });
  }

  if (
    WG_INITIAL_ENV.USERNAME &&
    WG_INITIAL_ENV.PASSWORD &&
    WG_INITIAL_ENV.HOST &&
    WG_INITIAL_ENV.PORT
  ) {
    DB_DEBUG('Creating initial user...');
    await db.users.create(WG_INITIAL_ENV.USERNAME, WG_INITIAL_ENV.PASSWORD);

    DB_DEBUG('Setting initial host and port...');
    await db.userConfigs.updateHostPort(
      WG_INITIAL_ENV.HOST,
      WG_INITIAL_ENV.PORT
    );

    await db.general.setSetupStep(0);
  }
}

function normalizeHookTemplate(hook: string) {
  return hook
    .replace(/-i wg0/g, '-i {{name}}')
    .replace(/-o wg0/g, '-o {{name}}');
}

async function normalizeInterfaceName(db: DBType) {
  const interfaceName = WG_ENV.INTERFACE_NAME;
  if (interfaceName === 'wg0') {
    return;
  }

  const configuredInterface = await db.query.wgInterface
    .findFirst({
      where: eq(schema.wgInterface.name, interfaceName),
    })
    .execute();

  if (configuredInterface) {
    return;
  }

  const defaultInterface = await db.query.wgInterface
    .findFirst({
      where: eq(schema.wgInterface.name, 'wg0'),
    })
    .execute();

  if (!defaultInterface) {
    return;
  }

  DB_DEBUG(`Renaming default interface wg0 to ${interfaceName}...`);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.wgInterface)
      .set({ name: interfaceName })
      .where(eq(schema.wgInterface.name, 'wg0'))
      .execute();

    await tx
      .update(schema.hooks)
      .set({ id: interfaceName })
      .where(eq(schema.hooks.id, 'wg0'))
      .execute();

    await tx
      .update(schema.userConfig)
      .set({ id: interfaceName })
      .where(eq(schema.userConfig.id, 'wg0'))
      .execute();

    await tx
      .update(schema.client)
      .set({ interfaceId: interfaceName })
      .where(eq(schema.client.interfaceId, 'wg0'))
      .execute();
  });
}

async function applyRuntimeInterfaceConfig(db: DBType) {
  const interfaceName = WG_ENV.INTERFACE_NAME;
  const interfaceConfig: {
    port: number;
    device?: string;
    firewallEnabled?: boolean;
  } = WG_ENV.WG_DEVICE
    ? { port: WG_ENV.WG_PORT, device: WG_ENV.WG_DEVICE }
    : { port: WG_ENV.WG_PORT };
  if (WG_ENV.FIREWALL_ENABLED !== undefined) {
    interfaceConfig.firewallEnabled = WG_ENV.FIREWALL_ENABLED;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.wgInterface)
      .set(interfaceConfig)
      .where(eq(schema.wgInterface.name, interfaceName))
      .execute();

    await tx
      .update(schema.userConfig)
      .set({ port: WG_ENV.WG_PORT })
      .where(eq(schema.userConfig.id, interfaceName))
      .execute();

    const hooks = await tx.query.hooks
      .findFirst({
        where: eq(schema.hooks.id, interfaceName),
      })
      .execute();

    if (!hooks) {
      return;
    }

    const nextPostUp = normalizeHookTemplate(hooks.postUp);
    const nextPostDown = normalizeHookTemplate(hooks.postDown);

    if (nextPostUp !== hooks.postUp || nextPostDown !== hooks.postDown) {
      await tx
        .update(schema.hooks)
        .set({
          postUp: nextPostUp,
          postDown: nextPostDown,
        })
        .where(eq(schema.hooks.id, interfaceName))
        .execute();
    }
  });
}

async function applyNixClientDefaults(db: DBType) {
  if (!WG_CLIENT_DEFAULTS.FORCE_UPDATE_CLIENTS) {
    return;
  }

  const clientDefaults: Partial<typeof schema.client.$inferInsert> = {};

  if (WG_CLIENT_DEFAULTS.DNS !== undefined) {
    clientDefaults.dns = WG_CLIENT_DEFAULTS.DNS;
  }

  if (WG_CLIENT_DEFAULTS.ALLOWED_IPS !== undefined) {
    clientDefaults.allowedIps = WG_CLIENT_DEFAULTS.ALLOWED_IPS;
  }

  if (WG_CLIENT_DEFAULTS.SERVER_ALLOWED_IPS !== undefined) {
    clientDefaults.serverAllowedIps = WG_CLIENT_DEFAULTS.SERVER_ALLOWED_IPS;
  }

  if (WG_CLIENT_DEFAULTS.FIREWALL_ALLOWED_IPS !== undefined) {
    clientDefaults.firewallIps = WG_CLIENT_DEFAULTS.FIREWALL_ALLOWED_IPS;
  }

  if (WG_CLIENT_DEFAULTS.PERSISTENT_KEEPALIVE !== undefined) {
    clientDefaults.persistentKeepalive = WG_CLIENT_DEFAULTS.PERSISTENT_KEEPALIVE;
  }

  if (Object.keys(clientDefaults).length === 0) {
    return;
  }

  DB_DEBUG('Force updating clients with Nix-managed defaults...');
  await db
    .update(schema.client)
    .set(clientDefaults)
    .where(eq(schema.client.interfaceId, WG_ENV.INTERFACE_NAME))
    .execute();
}

async function disableIpv6(db: DBType) {
  // This should match the initial value migration
  const postUpMatch =
    ' ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A FORWARD -i {{name}} -j ACCEPT; ip6tables -A FORWARD -o {{name}} -j ACCEPT;';
  const postDownMatch =
    ' ip6tables -t nat -D POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -D FORWARD -i {{name}} -j ACCEPT; ip6tables -D FORWARD -o {{name}} -j ACCEPT;';

  await db.transaction(async (tx) => {
    const hooks = await tx.query.hooks.findFirst({
      where: eq(schema.hooks.id, WG_ENV.INTERFACE_NAME),
    });

    if (!hooks) {
      throw new Error('Hooks not found');
    }

    if (hooks.postUp.includes(postUpMatch)) {
      DB_DEBUG('Disabling IPv6 in Post Up hooks...');
      await tx
        .update(schema.hooks)
        .set({
          postUp: hooks.postUp.replace(postUpMatch, ''),
          postDown: hooks.postDown.replace(postDownMatch, ''),
        })
        .where(eq(schema.hooks.id, WG_ENV.INTERFACE_NAME))
        .execute();
    } else {
      DB_DEBUG('IPv6 Post Up hooks already disabled, skipping...');
    }
    if (hooks.postDown.includes(postDownMatch)) {
      DB_DEBUG('Disabling IPv6 in Post Down hooks...');
      await tx
        .update(schema.hooks)
        .set({
          postUp: hooks.postUp.replace(postUpMatch, ''),
          postDown: hooks.postDown.replace(postDownMatch, ''),
        })
        .where(eq(schema.hooks.id, WG_ENV.INTERFACE_NAME))
        .execute();
    } else {
      DB_DEBUG('IPv6 Post Down hooks already disabled, skipping...');
    }
  });
}
