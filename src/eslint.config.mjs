import eslintConfigPrettier from 'eslint-config-prettier';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt([
  {
    rules: {
      // https://github.com/nuxt/eslint/issues/590
      // 'import/order': 'warn',
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    },
  },
  eslintConfigPrettier,
]);
