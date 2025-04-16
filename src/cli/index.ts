#!/usr/bin/env node

// ! Auto Imports are not supported in this file

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';
import { eq } from 'drizzle-orm';

import packageJson from '../package.json';
import * as schema from '../server/database/schema';
import { hashPassword } from '../server/utils/password';

const client = createClient({ url: 'file:/etc/wireguard/wg-easy.db' });
const db = drizzle({ client, schema });

const dbAdminReset = defineCommand({
  meta: {
    name: 'db:admin:reset',
    description: 'Reset the admin user',
  },
  args: {
    password: {
      type: 'string',
      description: 'New password for the admin user',
      required: false,
    },
  },
  async run(ctx) {
    let password = ctx.args.password || undefined;
    if (!password) {
      password = await consola.prompt('Please enter a new password:', {
        type: 'text',
      });
    }
    if (!password) {
      consola.error('Password is required');
      return;
    }
    if (password.length < 12) {
      consola.error('Password must be at least 12 characters long');
      return;
    }
    console.info('Setting new password for admin user...');
    const hash = await hashPassword(password);

    const user = await db.transaction(async (tx) => {
      const user = await tx
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, 1))
        .get();

      if (!user) {
        consola.error('Admin user not found');
        return;
      }

      await tx
        .update(schema.user)
        .set({
          password: hash,
        })
        .where(eq(schema.user.id, 1));

      return user;
    });

    if (!user) {
      consola.error('Failed to update admin user');
      return;
    }

    consola.success(
      `Successfully updated admin user ${user.id} (${user.username})`
    );
  },
});

const main = defineCommand({
  meta: {
    name: 'wg-easy',
    version: packageJson.version,
    description: 'Command Line Interface',
  },
  subCommands: {
    'db:admin:reset': dbAdminReset,
  },
});

runMain(main);
