export default defineEventHandler(async () => {
  const wgInterface = await Database.interfaces.get('wg0');
  return {
    ...wgInterface,
    privateKey: undefined,
  };
});
