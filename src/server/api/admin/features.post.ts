export default defineEventHandler(async (event) => {
  const { features } = await readValidatedBody(
    event,
    validateZod(featuresType)
  );
  await Database.system.updateFeatures(features);
  return { success: true };
});
