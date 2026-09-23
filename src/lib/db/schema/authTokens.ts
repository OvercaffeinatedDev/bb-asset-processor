import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

const authTokens = pgTable('auth_tokens', {
  id: serial('id').primaryKey().notNull(),
  // One cached token per platform — the unique constraint is what makes
  // upsertToken's insert-or-update a single atomic statement instead of a
  // separate delete + insert with a race window between them.
  site: varchar('site', { length: 2048 }).notNull().unique(),
  token: varchar('token', { length: 2048 }).notNull(),
  expirationDate: timestamp('expiration_date', { withTimezone: true }).notNull(),
});

export default authTokens;
