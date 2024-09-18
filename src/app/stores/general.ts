export const useGeneralStore = defineStore('General', () => {
  /**
   * @throws if unsuccessful
   */
  async function updateLanguage(language: string) {
    const response = await api.updateLanguage({ lang: language });
    return response.success;
  }

  return { updateLanguage };
});
