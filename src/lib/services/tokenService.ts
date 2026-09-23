import { eq } from 'drizzle-orm';

import db from '../db';
import authTokens from '../db/schema/authTokens';

export const getToken = async (site: string) => {
  const rows = await db.select().from(authTokens).where(eq(authTokens.site, site));
  return rows[0] ?? null;
};

export const upsertToken = async (site: string, token: string, expirationDate: Date) => {
  // A single atomic INSERT ... ON CONFLICT DO UPDATE instead of delete-then-insert —
  // the latter has a window where a concurrent request sees no row for `site` and
  // triggers its own token refresh, racing this one.
  await db
    .insert(authTokens)
    .values({ site, token, expirationDate })
    .onConflictDoUpdate({
      target: authTokens.site,
      set: { token, expirationDate },
    });
};

export const deleteToken = async (site: string) => {
  await db.delete(authTokens).where(eq(authTokens.site, site));
};
