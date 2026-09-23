import { defineConfig } from 'drizzle-kit';

import { env } from '@/lib/env/server';

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  dialect: 'postgresql',
  out: './src/lib/db/migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
    ssl: 'verify-full',
  },
});
