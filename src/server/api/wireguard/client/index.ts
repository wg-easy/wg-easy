import WireGuard from '~/utils/WireGuard';

export default defineEventHandler(async (event) => {
  if (isMethod(event, 'GET')) {
    return WireGuard.getClients();
  } else if (isMethod(event, 'POST')) {
    const { name } = await readBody(event);
    await WireGuard.createClient({ name });
    return { success: true };
  }
});
