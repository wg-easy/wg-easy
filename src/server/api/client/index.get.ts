export default definePermissionEventHandler(actions.CLIENT, () => {
  return WireGuard.getClients();
});
