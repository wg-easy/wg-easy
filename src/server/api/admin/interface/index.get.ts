export default definePermissionEventHandler(actions.ADMIN, async () => {
  const wgInterface = await Database.interfaces.get('wg0');

  if (!wgInterface) {
    throw new Error('Interface not found');
  }

  return {
    ...wgInterface,
    privateKey: undefined,
  };
});
