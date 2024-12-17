export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  const svg = await WireGuard.getClientQRCodeSVG({ clientId });
  setHeader(event, 'Content-Type', 'image/svg+xml');
  return svg;
});
