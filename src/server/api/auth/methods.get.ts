export default defineEventHandler(() => {
  return {
    google: OAUTH_GOOGLE_ENV.ENABLED,
  };
});
