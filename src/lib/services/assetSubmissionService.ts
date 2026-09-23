import { and, desc, eq } from 'drizzle-orm';

import db from '../db';
import assetSubmissions from '../db/schema/assetSubmissions';

type AssetSubmissionInsert = typeof assetSubmissions.$inferInsert;

export const getAssetSubmission = async (submissionId: string, assetId: string) => {
  const rows = await db
    .select()
    .from(assetSubmissions)
    .where(
      and(
        eq(assetSubmissions.submissionId, submissionId),
        eq(assetSubmissions.assetId, assetId)
      )
    );
  return rows[0] ?? null;
};

export const createAssetSubmission = async (data: AssetSubmissionInsert) => {
  await db.insert(assetSubmissions).values(data);
};

export const getAssetSubmissionById = async (id: string) => {
  const rows = await db.select().from(assetSubmissions).where(eq(assetSubmissions.id, id));
  return rows[0] ?? null;
};

// For the reports list, scoped to "this course" — the Report Manager
// placement's own context.id, not any one assignment's resourceLinkId.
export const getAssetSubmissionsByContext = async (contextId: string) => {
  return db
    .select()
    .from(assetSubmissions)
    .where(eq(assetSubmissions.contextId, contextId))
    .orderBy(desc(assetSubmissions.createdAt));
};

// Fallback for when there's no launch session to scope by (e.g. direct
// navigation during testing) — every row, newest first.
export const getAllAssetSubmissions = async () => {
  return db.select().from(assetSubmissions).orderBy(desc(assetSubmissions.createdAt));
};
