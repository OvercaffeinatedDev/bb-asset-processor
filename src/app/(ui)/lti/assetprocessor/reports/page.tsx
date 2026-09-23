import {
  getAllAssetSubmissions,
  getAssetSubmissionsByContext,
} from '@/lib/services/assetSubmissionService';
import { getSession } from '@/lib/services/sessionService';

import { dmSans, spaceMono } from '../config/fonts';
import ReportsListPanel, { type ReportListRow } from './reportsListPanel';
import styles from './reports.module.css';

interface RequestParams {
  error?: string;
  state?: string;
}

interface ErrorContent {
  code?: string;
  icon?: string;
  title: string;
  text: string;
}

// Every code any /lti/launch errorRedirect() can land here with — see the
// errorRedirect helper and message-type branches in (api)/lti/launch/route.ts.
const ERROR_CONTENT: Record<string, ErrorContent> = {
  reportNotFound: {
    code: '404',
    title: 'Report Not Found',
    text: "We couldn't find a report for this asset. It may not have finished processing yet, or it may have been removed.",
  },
  sessionNotFound: {
    icon: '⏱',
    title: 'Session Expired',
    text: 'This session has expired or is invalid. Please relaunch the tool from Blackboard.',
  },
  nonceMismatch: {
    icon: '⚠',
    title: 'Could Not Verify Request',
    text: 'This request could not be verified. Please try again from Blackboard.',
  },
  missingParams: {
    icon: '⚠',
    title: 'Ooops!',
    text: 'The request was received but could not be processed. Please try again from Blackboard.',
  },
  invalidJWT: {
    icon: '⚠',
    title: 'Ooops!',
    text: 'The request was received but could not be processed. Please try again from Blackboard.',
  },
  unknownMessageType: {
    icon: '❓',
    title: 'Unsupported Request',
    text: "This type of request isn't supported yet.",
  },
  serverError: {
    icon: '⚠',
    title: 'Something Went Wrong',
    text: 'An unexpected error occurred while processing your request. Please try again.',
  },
};

const DEFAULT_ERROR: ErrorContent = {
  icon: '⚠',
  title: 'Ooops!',
  text: 'The request was received but could not be processed. Please try again from Blackboard.',
};

const ErrorPanel = ({ content, code }: { content: ErrorContent; code: string }) => (
  <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
    <div className={styles.frame}>
      {content.code && <div className={styles.code}>{content.code}</div>}
      {content.icon && <div className={styles.icon}>{content.icon}</div>}
      <div className={styles.title}>{content.title}</div>
      <p className={styles.text}>{content.text}</p>
      <div className={styles.errorTag}>{code}</div>
    </div>
  </div>
);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);

// A launch's full raw JWT is stored on the session (jwtData) — loosely typed
// since it's a jsonb blob, not one specific message type's shape.
interface StoredContext {
  id?: string;
  title?: string;
  label?: string;
}
const getStoredContext = (jwtData: unknown): StoredContext | null => {
  if (!jwtData || typeof jwtData !== 'object') return null;
  const context = (jwtData as Record<string, unknown>)[
    'https://purl.imsglobal.org/spec/lti/claim/context'
  ];
  if (!context || typeof context !== 'object') return null;
  return context as StoredContext;
};

// Reached either via /lti/launch's Report Manager redirect (?state=…, a real
// LtiResourceLinkRequest launch) or its errorRedirect() (?error=…). Direct
// navigation with neither falls back to every submission on record, unscoped
// — handy for local testing, not something a real launch produces.
const AssetProcessorReports = async ({
  searchParams,
}: {
  searchParams: Promise<RequestParams>;
}) => {
  const params = await searchParams;

  if (params.error) {
    const content = ERROR_CONTENT[params.error] ?? DEFAULT_ERROR;
    return <ErrorPanel content={content} code={params.error} />;
  }

  let contextId: string | undefined;
  let subtitle = 'All submissions — no course context (direct access)';

  if (params.state) {
    const session = await getSession(params.state);
    if (!session) {
      return <ErrorPanel content={ERROR_CONTENT.sessionNotFound} code="sessionNotFound" />;
    }

    const context = getStoredContext(session.jwtData);
    contextId = context?.id;
    subtitle = context?.title
      ? `${context.title}${context.label ? ` · ${context.label}` : ''}`
      : "This course's context info wasn't available on the launch that got us here.";
  }

  const submissions = contextId
    ? await getAssetSubmissionsByContext(contextId)
    : await getAllAssetSubmissions();

  const rows: ReportListRow[] = submissions.map((s) => ({
    id: s.id,
    userId: s.userId,
    title: s.title || s.filename,
    submittedAtDisplay: formatDate(s.createdAt),
    score: s.plagiarismScore,
    reviewStatus: s.status,
  }));

  return <ReportsListPanel rows={rows} subtitle={subtitle} />;
};

export default AssetProcessorReports;
