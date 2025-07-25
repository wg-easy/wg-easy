import eslintConfigPrettier from 'eslint-config-prettier';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt([
  {
    rules: {
      'import/order': 'warn',
    },
  },
  eslintConfigPrettier,
]);
