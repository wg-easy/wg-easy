export default defineEventHandler((event) => {
    assertMethod(event, "GET");
    const {UI_TRAFFIC_STATS} = useRuntimeConfig();
    setHeader(event, 'Content-Type', 'application/json');
    return `"${UI_TRAFFIC_STATS}"`;
})