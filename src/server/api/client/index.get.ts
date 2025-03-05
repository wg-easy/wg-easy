export default definePermissionEventHandler('clients', 'custom', ({ user }) => {
  if (user.role === roles.ADMIN) {
    return WireGuard.getAllClients();
  }
  return WireGuard.getClientsForUser(user.id);
});
