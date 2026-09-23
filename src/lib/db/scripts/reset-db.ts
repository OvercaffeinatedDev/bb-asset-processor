// scripts/reset-db.ts
import { sql } from 'drizzle-orm';

import { env } from '@/lib/env/server';

import db from '../index';

async function resetDatabase() {
  // This drops and recreates the entire `public` schema — irrecoverable. Refuse
  // to run it against anything that claims to be a production database.
  if (env.NODE_ENV === 'production') {
    console.error('❌ Refusing to reset a database with NODE_ENV=production');
    process.exit(1);
  }

  try {
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`);
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);

    // eslint-disable-next-line no-console
    console.log('✅ Database reset complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
