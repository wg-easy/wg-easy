import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  actions.CLIENT,
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema)
    );
    const svg = await WireGuard.getClientQRCodeSVG({ clientId });
    setHeader(event, 'Content-Type', 'image/svg+xml');
    return svg;
  }
);
