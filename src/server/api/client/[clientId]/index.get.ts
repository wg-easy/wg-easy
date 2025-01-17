import { ClientGetSchema } from '~~/server/database/repositories/client/types';

export default definePermissionEventHandler(
  actions.CLIENT,
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );
    const result = await Database.clients.get(clientId);
    if (!result) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }
    return result;
  }
);
