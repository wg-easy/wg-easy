import WireGuard from "~/utils/WireGuard";

export default defineEventHandler(async (event) => {
    assertMethod(event, "PUT");
    const { file } = await readBody(event);
        await WireGuard.restoreConfiguration(file);
        return { success: true };
})