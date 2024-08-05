export default defineEventHandler((event) => {
    assertMethod(event, "GET");
    const {LANG} = useRuntimeConfig();
    setHeader(event, 'Content-Type', 'application/json');
    return `"${LANG}"`;
})