import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

const ltiSessions = pgTable('lti_sessions', {
  // `state` and `nonce` are plain LTI/OIDC values, not identity fields — the
  // previous column names ("id" / "email") were left over from a template and
  // didn't reflect what's actually stored here.
  state: uuid('state').primaryKey().notNull(),
  nonce: uuid('nonce').notNull(),
  // LTI's `deployment_id` and `aud` (client_id) are platform-issued strings, not
  // guaranteed to be UUIDs — storing them as `uuid` will reject any real-world
  // platform that sends a non-UUID value here.
  deploymentId: varchar('deployment_id', { length: 255 }).notNull(),
  sub: varchar('sub', { length: 255 }),
  aud: varchar('aud', { length: 255 }),
  deepLinkingReturnURL: varchar('dl_return_url', { length: 2048 }),
  deepLinkingData: varchar('dl_data', { length: 255 }),
  oneTimeSessionToken: varchar('one_time_session_token', { length: 50 }),
  siteUrl: varchar('site_url', { length: 2048 }),
  jwtData: jsonb('jwt_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export default ltiSessions;
