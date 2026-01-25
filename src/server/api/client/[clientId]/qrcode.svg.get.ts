import { ClientGetSchema, ClientQrSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'view',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );
    const { type } = await getValidatedQuery(
      event,
      validateZod(ClientQrSchema, event)
    );

    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    const svg = await WireGuard.getClientQRCodeSVG({ clientId, type });
    setHeader(event, 'Content-Type', 'image/svg+xml');
    return svg;
  }
);
