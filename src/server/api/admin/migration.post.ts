export default defineEventHandler(async (event) => {
  const { file } = await readValidatedBody(
    event,
    validateZod(fileType_, event)
  );
  // TODO: handle migration
  console.log('fileType_', file);
  return { success: true };
});
