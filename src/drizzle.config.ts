import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./wg-easy.db',
  },
});
