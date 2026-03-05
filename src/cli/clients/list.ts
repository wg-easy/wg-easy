import { defineCommand } from 'citty';
import { consola } from 'consola';

import { db } from '../db';

export default defineCommand({
  meta: {
    name: 'clients:list',
    description: 'List all clients',
  },
  async run() {
    consola.info('Listing all clients...');
    const clients = await db.query.client.findMany({
      columns: {
        id: true,
        name: true,
        publicKey: true,
        enabled: true,
      },
    });

    if (clients.length === 0) {
      consola.info('No clients found');
      return;
    }

    console.table(clients);
  },
});
