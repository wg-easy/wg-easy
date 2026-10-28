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
            {
              name: 'h3',
              message:
                'Use nuxt/server. H3 is only needed by server/http/translation.ts.',
            },
            {
              name: '@intlify/h3',
              message:
                'Use the validation helpers in server/http/validation.ts.',
            },
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
            'nuxt/server',
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
          paths: ['h3', 'nuxt/server', '@intlify/h3', 'drizzle-orm'],
          patterns: ['#server/**', '#db/**', 'node:*'],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
