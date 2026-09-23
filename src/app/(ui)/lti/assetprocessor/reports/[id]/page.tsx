import Link from 'next/link';

import { getAssetSubmissionById } from '@/lib/services/assetSubmissionService';
import { getIndicationColor } from '@/lib/utils/assetReport';

import { dmSans, spaceMono } from '../../config/fonts';
import styles from './reportDetail.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

const ErrorPanel = ({ message }: { message: string }) => (
  <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
    <div className={styles.frame}>
      <div className={styles.errorBody}>
        <h1 className={styles.errorTitle}>Ooops!</h1>
        <p className={styles.errorText}>{message}</p>
      </div>
    </div>
  </div>
);

const formatFileSize = (bytes: number | null) => {
  if (bytes === null) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

const scoreVerdict = (score: number) => {
  if (score <= 30) return 'Low Similarity';
  if (score <= 70) return 'Moderate Similarity';
  return 'High Similarity';
};

// Ported from the "Report Detail" wireframe (Screen 5 of 5):
// https://claude.ai/design/p/48f10ec3-edf6-4629-bd10-70a43b1b3a4b
// Document preview (left) + score/status/submission info (right), backed by
// one asset_submissions row. Reached at /lti/assetprocessor/reports/[id] —
// the future reports list page will link here per submission.
const ReportDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;

  const submission = await getAssetSubmissionById(id);
  if (!submission) {
    return <ErrorPanel message="This report doesn't exist or may have been removed." />;
  }

  const fileUrl = `/lti/reports/${submission.id}/file`;
  const color = getIndicationColor(submission.plagiarismScore);
  const isPdf = (submission.contentType ?? '').startsWith('application/pdf');
  const isImage = (submission.contentType ?? '').startsWith('image/');

  return (
    <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
      <div className={styles.frame}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.tbT}>{submission.title || submission.filename}</div>
            <div className={styles.tbS}>Report Detail · Submitted {formatDate(submission.createdAt)}</div>
          </div>
          <div className={styles.tbActions}>
            <span
              className={`${styles.badge} ${submission.status === 'posted' ? styles.badgePosted : styles.badgeReview}`}
            >
              {submission.status === 'posted' ? 'Posted' : 'Under Review'}
            </span>
            <a href={fileUrl} download={submission.filename} className={styles.btn}>
              ⇩ Download
            </a>
          </div>
        </div>

        <div className={styles.split}>
          <div className={styles.splitL}>
            <div className={styles.docToolbar}>
              <span>{submission.filename}</span>
              <span>|</span>
              <span>{formatFileSize(submission.fileSize)}</span>
              {submission.contentType && (
                <>
                  <span>|</span>
                  <span>{submission.contentType}</span>
                </>
              )}
            </div>
            <div className={styles.docViewer}>
              {isPdf && <iframe src={fileUrl} className={styles.pdfFrame} title="Document preview" />}
              {isImage && (
                // Arbitrary platform-hosted file — not something next/image can optimize.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl} alt={submission.filename} className={styles.imgPreview} />
              )}
              {!isPdf && !isImage && (
                <div className={styles.noPreview}>
                  No inline preview available for this file type.
                  <br />
                  Use Download above to view it.
                </div>
              )}
            </div>
          </div>

          <div className={styles.splitR}>
            <div className={styles.analysisBody}>
              <div className={styles.scoreCard}>
                <div className={styles.scoreLabel}>Similarity Score</div>
                <div className={styles.scoreRing} style={{ borderColor: color, color }}>
                  <div className={styles.scoreValue}>{submission.plagiarismScore}%</div>
                  <div className={styles.scoreUnit}>similarity</div>
                </div>
                <div className={styles.scoreVerdict} style={{ color }}>
                  {scoreVerdict(submission.plagiarismScore)}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardTitle}>Submission Info</div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>File</span>
                  <span className={styles.infoValue}>{submission.filename}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Submitted</span>
                  <span className={styles.infoValue}>{formatDate(submission.createdAt)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Size</span>
                  <span className={styles.infoValue}>{formatFileSize(submission.fileSize)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Status</span>
                  <span className={styles.infoValue}>
                    {submission.status === 'posted' ? 'Posted' : 'Under Review'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Student ID</span>
                  <span className={styles.infoValue}>{submission.userId}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Asset ID</span>
                  <span className={styles.infoValue}>{submission.assetId}</span>
                </div>
              </div>

              <Link href="/lti/assetprocessor/reports" className={styles.backLink}>
                ← Back to Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailPage;
