export default defineEventHandler(async (event) => {
  assertMethod(event, 'GET');
  const clientId = getRouterParam(event, 'clientId');
  const svg = await WireGuard.getClientQRCodeSVG({ clientId });
  setHeader(event, 'Content-Type', 'image/svg+xml');
  return svg;
});
