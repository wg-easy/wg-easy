export default definePermissionEventHandler('admin', 'any', async () => {
  await WireGuard.Restart();

  return { success: true };
});
