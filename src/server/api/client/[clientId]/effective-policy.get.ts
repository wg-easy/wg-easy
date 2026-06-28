import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { resolveClientEffectivePolicy } from '#shared/utils/clientPolicy';
import { validateZod } from '#server/utils/types';
import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'view',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );

    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    const [wgInterface, userConfig, groups] = await Promise.all([
      Database.interfaces.get(),
      Database.userConfigs.get(),
      Database.clientGroups.getGroupsForClient(clientId),
    ]);

    const policy = resolveClientEffectivePolicy({
      client,
      groups,
      userConfig,
      firewallEnabled: wgInterface.firewallEnabled,
    });

    return policy.fields;
  }
);
