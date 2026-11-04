import { defineCommand } from 'citty';
import { consola } from 'consola';

import { db } from '#cli/db';
import { createStore } from '#db/store';
import { resetAdministrator } from '#server/features/identity/recovery';
import { WG_ENV } from '#server/utils/config';

export default defineCommand({
  meta: {
    name: 'db:admin:reset',
    description: 'Reset the admin user password and TOTP settings',
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
    consola.info('Setting new password for admin user...');
    const user = await resetAdministrator(
      createStore(db, WG_ENV.WG_INTERFACE),
      password
    );

    if (!user) {
      consola.error('Failed to update admin user');
      return;
    }

    consola.success(
      `Successfully updated admin user ${user.id} (${user.username})`
    );
  },
});
