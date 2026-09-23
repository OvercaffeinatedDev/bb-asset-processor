import { integer, pgEnum, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

// Whether the report has been shared with the student yet. No real workflow
// drives this transition yet — new rows get a random status (see
// launch/route.ts) purely so the report list/detail UI has both states to
// show; there's no "Post" action anywhere that flips one to the other.
export const submissionStatusEnum = pgEnum('submission_status', ['under_review', 'posted']);

const assetSubmissions = pgTable(
  'asset_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deploymentId: varchar('deployment_id', { length: 255 }).notNull(),
    submissionId: varchar('submission_id', { length: 255 }).notNull(),
    activityId: varchar('activity_id', { length: 255 }),
    // Identifies which assignment/placement this asset belongs to — required to
    // submit the originality report back to Blackboard's assetreport endpoint
    // (report payload keys on { resourceLinkId, assetId }).
    resourceLinkId: varchar('resource_link_id', { length: 255 }).notNull(),
    // The course/context this submission came from — the Report Manager
    // placement (LtiResourceLinkRequest + custom.reportManager) is launched at
    // course level, with its own resource_link id, so the reports list filters
    // by this instead of resourceLinkId. Nullable: rows saved before this
    // column existed won't have it.
    contextId: varchar('context_id', { length: 255 }),
    contextTitle: varchar('context_title', { length: 512 }),
    assetId: varchar('asset_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    title: varchar('title', { length: 512 }),
    // Original filename as sent by the platform.
    filename: varchar('filename', { length: 512 }).notNull(),
    // Name the file was actually written under in ./fileDownloads (a
    // uuid-prefixed, filesystem-safe version of `filename`) — the file lives on
    // whichever machine ran the download, the DB is remote, so this is the only
    // link back to it from a row.
    storedFilename: varchar('stored_filename', { length: 600 }).notNull(),
    contentType: varchar('content_type', { length: 255 }),
    fileSize: integer('file_size'),
    checksum: varchar('checksum', { length: 255 }),
    // Placeholder: a random 0-100 score, not a real analysis — see conversation.
    plagiarismScore: integer('plagiarism_score').notNull(),
    status: submissionStatusEnum('status').notNull().default('under_review'),
    reportUrl: varchar('report_url', { length: 2048 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Blackboard may resend the same notice (retries) — this is what makes
    // storing+scoring a given asset idempotent instead of duplicating rows and
    // re-downloading the file on every retry.
    unique('asset_submissions_submission_asset_unique').on(table.submissionId, table.assetId),
  ]
);

export default assetSubmissions;
