import WireGuard from "~/utils/WireGuard";

export default defineEventHandler(async (event) => {
    assertMethod(event, "PUT");
    const clientId = getRouterParam(event, 'clientId');
        if (clientId === '__proto__' || clientId === 'constructor' || clientId === 'prototype') {
          throw createError({ status: 403 });
        }
        const { name } = await readBody(event);
        await WireGuard.updateClientName({ clientId, name });
        return { success: true };
})