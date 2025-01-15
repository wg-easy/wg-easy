import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './migrations',
  schema: './services/database/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./wg0.db',
  },
});
