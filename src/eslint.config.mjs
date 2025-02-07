import { createConfigForNuxt } from '@nuxt/eslint-config/flat';
import eslintConfigPrettier from 'eslint-config-prettier';

export default createConfigForNuxt().append(eslintConfigPrettier);

// TODO: add typescript-eslint, import/order, ban raw defineEventHandler
