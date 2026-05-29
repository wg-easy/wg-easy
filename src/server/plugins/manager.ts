export default defineNitroPlugin((nitroApp) => {
  console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   wg-easy - https://github.com/wg-easy/wg-easy   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ wg-easy:  ${RELEASE.padEnd(38)} ┃
┃ Node:     ${process.version.padEnd(38)} ┃
┃ Platform: ${process.platform.padEnd(38)} ┃
┃ Arch:     ${process.arch.padEnd(38)} ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);
  nitroApp.hooks.hook('close', async () => {
    console.log('Shutting down');
    await WireGuard.Shutdown();
  });
});
