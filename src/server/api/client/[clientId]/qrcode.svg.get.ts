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

    const svg = await WireGuard.getClientQRCodeSVG({ clientId });
    setHeader(event, 'Content-Type', 'image/svg+xml');
    return svg;
  }
);
