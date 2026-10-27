import eslintConfigPrettier from 'eslint-config-prettier';

import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt([
  { rules: { 'import/order': ['warn', { 'newlines-between': 'always' }] } },
  {
    files: ['server/api/**/*.ts', 'server/routes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'drizzle-orm', message: 'Keep SQL in the repositories.' },
          ],
        },
      ],
    },
  },
  {
    files: ['server/database/repositories/**/repository.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            'h3',
            '#server/utils/config',
            '#server/utils/wgHelper',
            '#server/utils/cmd',
          ],
          patterns: [
            {
              group: ['#server/features/**'],
              message: 'Repositories only persist data.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['h3', '@intlify/h3', 'drizzle-orm'],
          patterns: ['#server/**', '#db/**', 'node:*'],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
