import { createConfigForNuxt } from '@nuxt/eslint-config/flat';
import eslintConfigPrettier from 'eslint-config-prettier';

export default createConfigForNuxt()
  .append({
    rules: {
      'vue/no-multiple-template-root': 'off',
    },
  })
  .append(eslintConfigPrettier);
