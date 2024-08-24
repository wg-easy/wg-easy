import type { Lang, SystemProvider } from '@/server/databases/entities/system';

class SystemRepository {
  async getLang(provider: SystemProvider): Promise<Lang> {
    const _system = await provider.getSystem();
    if (_system) {
      const { lang } = _system;
      return lang;
    }
    return 'en';
  }
}

export default new SystemRepository();
