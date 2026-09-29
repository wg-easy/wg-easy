import { drizzle } from 'drizzle-orm/libsql';
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { createDebug } from 'obug';
import { eq } from 'drizzle-orm';

import { GeneralService } from '#db/repositories/general/service';
import { UserService } from '#db/repositories/user/service';
import { UserConfigService } from '#db/repositories/userConfig/service';
import { InterfaceService } from '#db/repositories/interface/service';
import { HooksService } from '#db/repositories/hooks/service';
import { OneTimeLinkService } from '#db/repositories/oneTimeLink/service';
import { ClientService } from '#db/repositories/client/service';
import * as schema from '#db/schema';
import { assertSeparateNetworks } from '#server/utils/protocol';
import { InterfaceCidrUpdateSchema } from '#db/repositories/interface/types';
import { PortSchema } from '#server/utils/types';
import { WG_ENV, WG_INITIAL_ENV } from '#server/utils/config';

const DB_DEBUG = createDebug('Database');

const client = createClient({ url: 'file:/etc/wireguard/wg-easy.db' });
const db = drizzle({ client, schema });

export async function connect() {
  await migrate();
  await renameInterface(db);
  const dbService = new DBService(db);

  if (WG_INITIAL_ENV.ENABLED) {
    await initialSetup(dbService);
  }

  await ensureClassicInterface(db);

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
    throw e;
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

// Renames the interface to the one specified in `WG_INTERFACE` then hooks, users, and clients via `ON UPDATE CASCADE`
async function renameInterface(db: DBType) {
  const wgInterface = await db.query.wgInterface.findFirst({
    where: eq(schema.wgInterface.protocol, 'awg'),
  });

  if (!wgInterface) {
    throw new Error('Interface not found');
  }

  if (wgInterface.name === WG_ENV.WG_INTERFACE) {
    return;
  }

  DB_DEBUG(
    `Renaming Interface ${wgInterface.name} to ${WG_ENV.WG_INTERFACE}...`
  );
  await db
    .update(schema.wgInterface)
    .set({ name: WG_ENV.WG_INTERFACE })
    .where(eq(schema.wgInterface.name, wgInterface.name))
    .execute();
}

async function disableIpv6(db: DBType) {
  // This should match the initial value migration
  const postUpMatch =
    ' ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A FORWARD -i {{interface}} -j ACCEPT; ip6tables -A FORWARD -o {{interface}} -j ACCEPT;';
  const postDownMatch =
    ' ip6tables -t nat -D POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -D FORWARD -i {{interface}} -j ACCEPT; ip6tables -D FORWARD -o {{interface}} -j ACCEPT;';

  await db.transaction(async (tx) => {
    const allHooks = await tx.query.hooks.findMany();
    for (const hooks of allHooks) {
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
          .where(eq(schema.hooks.id, hooks.id))
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
          .where(eq(schema.hooks.id, hooks.id))
          .execute();
      } else {
        DB_DEBUG('IPv6 Post Down hooks already disabled, skipping...');
      }
    }
  });
}

async function ensureClassicInterface(db: DBType) {
  if (WG_ENV.WG_INTERFACE === WG_ENV.CLASSIC_WG_INTERFACE) {
    throw new Error('AWG and WG interface names must differ');
  }
  await db.transaction(async (tx) => {
    const awg = await tx.query.wgInterface.findFirst({
      where: eq(schema.wgInterface.protocol, 'awg'),
    });
    if (!awg) throw new Error('AWG interface not found');
    const existing = await tx.query.wgInterface.findFirst({
      where: eq(schema.wgInterface.protocol, 'wg'),
    });
    if (existing) {
      assertSeparateNetworks(awg, existing);
      if (existing.name !== WG_ENV.CLASSIC_WG_INTERFACE) {
        await tx
          .update(schema.wgInterface)
          .set({ name: WG_ENV.CLASSIC_WG_INTERFACE })
          .where(eq(schema.wgInterface.name, existing.name));
      }
      return;
    }
    const cidrs = InterfaceCidrUpdateSchema.parse({
      ipv4Cidr: process.env.CLASSIC_WG_IPV4_CIDR || '10.9.0.0/24',
      ipv6Cidr: process.env.CLASSIC_WG_IPV6_CIDR || 'fdcc:ad94:bacf:61a5::/112',
    });
    assertSeparateNetworks(awg, cidrs);
    const port = PortSchema.parse(Number(process.env.CLASSIC_WG_PORT || 51822));
    if (port === awg.port) throw new Error('AWG and WG ports must differ');
    const config = await tx.query.userConfig.findFirst({
      where: eq(schema.userConfig.id, awg.name),
    });
    if (!config) throw new Error('AWG client defaults not found');
    const name = WG_ENV.CLASSIC_WG_INTERFACE;
    await tx.insert(schema.wgInterface).values({
      name,
      protocol: 'wg',
      device: awg.device,
      port,
      ...cidrs,
      privateKey: '---default---',
      publicKey: '---default---',
      mtu: 1420,
      enabled: true,
      jC: null,
      jMin: null,
      jMax: null,
      s1: null,
      s2: null,
    });
    // Do not copy custom AWG hooks: they may contain hardcoded interface names.
    const hook = (action: string) =>
      `iptables -t nat -${action} POSTROUTING -s {{ipv4Cidr}} -o {{device}} -j MASQUERADE; iptables -${action} INPUT -p udp -m udp --dport {{port}} -j ACCEPT; iptables -${action} FORWARD -i {{interface}} -j ACCEPT; iptables -${action} FORWARD -o {{interface}} -j ACCEPT; ip6tables -t nat -${action} POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -${action} INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -${action} FORWARD -i {{interface}} -j ACCEPT; ip6tables -${action} FORWARD -o {{interface}} -j ACCEPT;`;
    await tx
      .insert(schema.hooks)
      .values({
        id: name,
        preUp: '',
        preDown: '',
        postUp: hook('A'),
        postDown: hook('D'),
      });
    await tx
      .insert(schema.userConfig)
      .values({
        ...config,
        id: name,
        port,
        defaultJC: null,
        defaultJMin: null,
        defaultJMax: null,
        defaultI1: null,
        defaultI2: null,
        defaultI3: null,
        defaultI4: null,
        defaultI5: null,
      });
  });
}
