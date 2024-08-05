import WireGuard from "~/utils/WireGuard";

export default defineEventHandler(() => {
    return WireGuard.getClients();
})