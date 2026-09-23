import { desc, eq, isNotNull } from 'drizzle-orm';

import db from '../db';
import ltiSessions from '../db/schema/ltiSession';

type SessionInsert = typeof ltiSessions.$inferInsert;
type SessionUpdate = Partial<
  Omit<SessionInsert, 'state' | 'deploymentId' | 'nonce' | 'createdAt'>
>;

export const getSession = async (state: string) => {
  const rows = await db.select().from(ltiSessions).where(eq(ltiSessions.state, state));
  return rows[0] ?? null;
};

export interface KnownDeployment {
  deploymentId: string;
  siteUrl: string;
}

// Deployments we've actually seen launches from, with each one's most recent
// known site URL — sourced from real session rows instead of admin-entered
// config, e.g. for admin/eula's deployment picker.
export const getKnownDeployments = async (): Promise<KnownDeployment[]> => {
  const rows = await db
    .select({
      deploymentId: ltiSessions.deploymentId,
      siteUrl: ltiSessions.siteUrl,
    })
    .from(ltiSessions)
    .where(isNotNull(ltiSessions.siteUrl))
    .orderBy(desc(ltiSessions.createdAt));

  const byDeployment = new Map<string, KnownDeployment>();
  for (const row of rows) {
    if (row.siteUrl && !byDeployment.has(row.deploymentId)) {
      byDeployment.set(row.deploymentId, { deploymentId: row.deploymentId, siteUrl: row.siteUrl });
    }
  }
  return Array.from(byDeployment.values());
};

export const createSession = async (data: {
  state: string;
  deploymentId: string;
  nonce: string;
}) => {
  await db.insert(ltiSessions).values(data);
};

export const updateSession = async (state: string, data: SessionUpdate) => {
  await db.update(ltiSessions).set(data).where(eq(ltiSessions.state, state));
};
