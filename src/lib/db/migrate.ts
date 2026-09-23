import { migrate } from 'drizzle-orm/postgres-js/migrator';

import config from '@/../drizzle.config';
import { env } from '@/lib/env/server';

import db, { client } from './index';

if (!env.DB_MIGRATING) {
  throw new Error(
    'DB_MIGRATING environment variable is not set to true. Migration aborted.'
  );
}

try {
  await migrate(db, { migrationsFolder: config.out! });
} finally {
  // Always release the connection, even if a migration fails partway through —
  // otherwise the process hangs on an open connection instead of surfacing the error.
  await client.end();
}
