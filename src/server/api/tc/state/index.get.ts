import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';

export default definePermissionEventHandler(
  'admin',
  'any',
  async () => {
    const state = await Database.tcState.get();
    const allClients = await Database.clients.getAllPublic({});

    return {
      clients: allClients.map((c) => ({
        id: c.id,
        name: c.name,
        ipv4Address: c.ipv4Address,
        enabled: c.enabled,
      })),
      tcState: state,
    };
  }
);