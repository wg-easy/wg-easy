import { createError } from 'h3';

import type { ClientService } from '#db/repositories/client/service';
import type {
  ClientBulkType,
  ClientCreateType,
  UpdateClientType,
} from '#db/repositories/client/types';
import type { UserType } from '#db/repositories/user/types';
import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import type { ID } from '#server/utils/types';
import { hasPermissionsWithData } from '#shared/utils/permissions';

type ClientAction =
  | ClientBulkType['action']
  | 'rotateKeyPair'
  | 'rotatePreSharedKey'
  | 'removePreSharedKey';

type Dependencies = {
  clients: ClientService;
  synchronize: () => Promise<void>;
};

/** Authorized client changes, including synchronization of the saved state. */
export class ClientMutations {
  constructor(private readonly dependencies: Dependencies) {}

  async create(user: UserType, data: ClientCreateType) {
    hasPermissionsWithData(user, 'clients', 'create').check();

    return this.#commit(async () => {
      const result = await this.dependencies.clients.create(data);
      return result[0]!.clientId;
    });
  }

  async update(user: UserType, clientId: ID, data: UpdateClientType) {
    await this.#checkClient(user, clientId);
    await this.#commit(() => this.dependencies.clients.update(clientId, data));
  }

  async apply(user: UserType, clientId: ID, action: ClientAction) {
    if (action === 'enable' || action === 'disable' || action === 'delete') {
      await this.#changeAccess(user, { action, clientIds: [clientId] }, true);
      return;
    }

    await this.#checkClient(user, clientId);
    await this.#commit(async () => {
      await this.dependencies.clients[action](clientId);
    });
  }

  bulk(user: UserType, data: ClientBulkType) {
    return this.#changeAccess(user, data, false);
  }

  async #checkClient(user: UserType, clientId: ID) {
    const client = await this.dependencies.clients.getPublic(clientId);
    // Check ownership first, so a missing client does not disclose existence.
    hasPermissionsWithData(user, 'clients', 'update').check(client);
    if (!client) {
      throw createError({ statusCode: 404, statusMessage: 'Client not found' });
    }
  }

  #changeAccess(user: UserType, data: ClientBulkType, single: boolean) {
    const permission = hasPermissionsWithData(
      user,
      'clients',
      data.action === 'delete' ? 'delete' : 'update'
    );

    return this.#commit(() =>
      this.dependencies.clients.bulkAction(data, (clients) => {
        for (const client of clients) permission.check(client);
        if (single && clients.length === 0) permission.check();

        if (clients.length !== data.clientIds.length) {
          throw createError(
            single
              ? { statusCode: 404, statusMessage: 'Client not found' }
              : {
                  statusCode: 404,
                  message:
                    'Some selected clients no longer exist. Refresh and try again.',
                }
          );
        }

        const now = Date.now();
        if (
          data.action === 'enable' &&
          clients.some(
            (client) =>
              client.expiresAt !== null &&
              now > new Date(client.expiresAt).getTime()
          )
        ) {
          const message = single
            ? 'Client is expired. Please update the expiration date first.'
            : 'Some selected clients are expired. Update their expiration dates before enabling them.';
          throw createError({
            statusCode: 422,
            message,
            ...(single ? { statusMessage: message } : {}),
          });
        }
      })
    );
  }

  async #commit<T>(change: () => Promise<T>) {
    const result = await change();
    // WireGuard cannot join the database transaction. A sync failure rejects
    // the operation but leaves the saved change available for a later sync.
    await this.dependencies.synchronize();
    return result;
  }
}

export default new ClientMutations({
  // Database initialization is asynchronous; resolve its current provider
  // when an operation runs, rather than capturing the startup placeholder.
  get clients() {
    return Database.clients;
  },
  synchronize: () => WireGuard.saveConfig(),
});
