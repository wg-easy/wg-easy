export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', () => {
    console.log('Shutting down');
    WireGuard.Shutdown();
  });
});
