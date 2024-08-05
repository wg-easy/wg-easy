export default defineEventHandler((event) => {
    assertMethod(event, "GET");
    const {UI_CHART_TYPE} = useRuntimeConfig();
    setHeader(event, 'Content-Type', 'application/json');
    return `"${UI_CHART_TYPE}"`;
})