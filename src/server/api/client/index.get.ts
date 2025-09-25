export default definePermissionEventHandler(
  'clients',
  'custom',
  ({ event, user }) => {
    const { filter } = getQuery(event);
    if (user.role === roles.ADMIN) {
      return WireGuard.filterClients(null, filter as string);
    }
    return WireGuard.filterClients(user.id, filter as string);
  }
);
