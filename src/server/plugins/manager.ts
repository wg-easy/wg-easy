export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    console.log('Shutting down');
    await WireGuard.Shutdown();
  });
});
