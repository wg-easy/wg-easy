import { drizzle } from 'drizzle-orm/libsql';
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import debug from 'debug';
import { eq } from 'drizzle-orm';

import * as schema from './schema';
import { ClientService } from './repositories/client/service';
import { GeneralService } from './repositories/general/service';
import { UserService } from './repositories/user/service';
import { UserConfigService } from './repositories/userConfig/service';
import { InterfaceService } from './repositories/interface/service';
import { HooksService } from './repositories/hooks/service';
import { OneTimeLinkService } from './repositories/oneTimeLink/service';
import { generateAwgObfuscationParams } from '#utils/awg-params';

const DB_DEBUG = debug('Database');

const client = createClient({ url: 'file:/etc/wireguard/wg-easy.db' });
const db = drizzle({ client, schema });

export async function connect() {
  await migrate();
  const dbService = new DBService(db);

  // Always generate random AWG params on first run (even without INIT_ENABLED)
  await generateRandomAwgParams(dbService);

  if (WG_INITIAL_ENV.ENABLED) {
    await initialSetup(dbService);
  }

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
    // Use absolute path to avoid issues with working directory
    const path = await import('path');
    const migrationsPath = path.join(process.cwd(), 'server', 'database', 'migrations');
    DB_DEBUG('Using migrations path:', migrationsPath);
    await drizzleMigrate(db, {
      migrationsFolder: migrationsPath,
    });
    DB_DEBUG('Migration complete');
  } catch (e) {
    if (e instanceof Error) {
      DB_DEBUG('Failed to migrate database:', e.message);
      DB_DEBUG('Migration error details:', e);
      // Don't silently fail - this is critical
      throw e;
    }
  }
}

async function generateRandomAwgParams(db: DBServiceType) {
  // Generate random AmneziaWG obfuscation parameters on first run
  // Check if interface is using default values (including magic headers)
  const currentInterface = await db.interfaces.get();
  const isUsingDefaults =
    currentInterface.jc === 8 &&
    currentInterface.jmin === 8 &&
    currentInterface.jmax === 80 &&
    currentInterface.s1 === 50 &&
    currentInterface.s2 === 85 &&
    currentInterface.h1 === 1376979037 &&
    currentInterface.h2 === 1283620850 &&
    currentInterface.h3 === 917053776 &&
    currentInterface.h4 === 696394151;

  if (isUsingDefaults) {
    DB_DEBUG('Generating random AmneziaWG obfuscation parameters...');
    const awgParams = generateAwgObfuscationParams();
    DB_DEBUG('Generated AWG params:', awgParams);
    await db.interfaces.update(awgParams);
  } else {
    DB_DEBUG('AWG params already customized, skipping generation');
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

async function disableIpv6(db: DBType) {
  // This should match the initial value migration
  const postUpMatch =
    ' ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT;';
  const postDownMatch =
    ' ip6tables -t nat -D POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT;';

  await db.transaction(async (tx) => {
    const hooks = await tx.query.hooks.findFirst({
      where: eq(schema.hooks.id, 'wg0'),
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
        .where(eq(schema.hooks.id, 'wg0'))
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
        .where(eq(schema.hooks.id, 'wg0'))
        .execute();
    } else {
      DB_DEBUG('IPv6 Post Down hooks already disabled, skipping...');
    }
  });
}
