export default defineEventHandler((event) => {
    assertMethod(event, "GET");
    const {RELEASE} = useRuntimeConfig();
    setHeader(event, 'Content-Type', 'application/json');
    return RELEASE;
})