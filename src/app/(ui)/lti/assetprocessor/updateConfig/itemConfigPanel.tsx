'use client';

import { useState } from 'react';

import { dmSans, spaceMono } from '../config/fonts';
import { submitUpdateConfig } from './actions';
import styles from './updateConfig.module.css';

type SubmissionMode = 'warn' | 'block';
type Visibility = 'full' | 'score' | 'hidden';

interface ItemConfigPanelProps {
  state: string;
  platformOrigin: string | null;
}

// Ported from the "Item Configuration" wireframe (Screen 2 of 5):
// https://claude.ai/design/p/48f10ec3-edf6-4629-bd10-70a43b1b3a4b
// Same peek panel, shown when the instructor edits an already-enabled assignment
// (reached via an LtiAssetProcessorSettingsRequest launch, not deep linking).
//
// There's no table to persist per-assignment settings to yet, so — same as the
// initial config panel — every field here starts from its own hardcoded default
// state. This intentionally does NOT read from ../config/configPanel.tsx: the two
// screens aren't meant to share client state, only the (currently nonexistent)
// persisted record they'll both read/write once that exists.
const ItemConfigPanel = ({ state, platformOrigin }: ItemConfigPanelProps) => {
  const [threshold, setThreshold] = useState(60);
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('warn');

  const [visibility, setVisibility] = useState<Visibility>('full');

  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [requireEula, setRequireEula] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [emailOnFlag, setEmailOnFlag] = useState(true);

  const [excludeBibliography, setExcludeBibliography] = useState(true);
  const [excludeQuotedText, setExcludeQuotedText] = useState(true);
  const [excludeSmallMatches, setExcludeSmallMatches] = useState(false);
  const [excludeCourseMaterials, setExcludeCourseMaterials] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const closeLtiModal = () => {
    const target = window.opener || window.parent;
    target.postMessage({ subject: 'lti.close' }, platformOrigin ?? '*');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await submitUpdateConfig(state);
      if (!result.success) {
        setSaveError(result.error ?? 'Failed to save changes. Please try again.');
        return;
      }
      closeLtiModal();
    } catch {
      setSaveError('A network error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    closeLtiModal();
  };

  return (
    <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
      <div className={styles.frame}>
        <div className={styles.topbar}>
          <div style={{ overflow: 'hidden' }}>
            <div className={styles.tbBreadcrumb}>← Essay 2 / Similarity Checker</div>
            <div className={styles.tbT}>Assignment Settings</div>
          </div>
          <span className={styles.badge}>Enabled</span>
        </div>

        <div className={styles.statusStrip}>
          <div className={styles.statusCell}>
            <div className={styles.statusValue} style={{ color: 'var(--t1)' }}>
              24
            </div>
            <div className={styles.statusLabel}>Total</div>
          </div>
          <div className={styles.statusCell}>
            <div className={styles.statusValue} style={{ color: 'var(--gn)' }}>
              19
            </div>
            <div className={styles.statusLabel}>Analyzed</div>
          </div>
          <div className={styles.statusCell}>
            <div className={styles.statusValue} style={{ color: 'var(--rd)' }}>
              3
            </div>
            <div className={styles.statusLabel}>Flagged</div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>Similarity Threshold</span>
            <div className={styles.dividerLine} />
          </div>
          <div className={styles.thresholdHeader}>
            <span style={{ color: 'var(--t3)' }}>Flag at or above:</span>
            <span className={styles.thresholdValue}>{threshold}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className={styles.slider}
            style={{
              background: `linear-gradient(to right, var(--ac) ${threshold}%, var(--bd2) ${threshold}%)`,
            }}
            aria-label="Similarity threshold percentage"
          />
          <div className={styles.radioGroup} role="radiogroup" aria-label="Threshold action">
            <button
              type="button"
              role="radio"
              aria-checked={submissionMode === 'warn'}
              className={`${styles.row} ${styles.rowInline}`}
              onClick={() => setSubmissionMode('warn')}
            >
              <div className={`${styles.rad} ${submissionMode === 'warn' ? styles.radOn : ''}`} />
              Warn only
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={submissionMode === 'block'}
              className={`${styles.row} ${styles.rowInline}`}
              onClick={() => setSubmissionMode('block')}
            >
              <div className={`${styles.rad} ${submissionMode === 'block' ? styles.radOn : ''}`} />
              Block submit
            </button>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>Student Visibility</span>
            <div className={styles.dividerLine} />
          </div>
          <div role="radiogroup" aria-label="Student visibility">
            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'full'}
              className={styles.row}
              onClick={() => setVisibility('full')}
            >
              <div className={`${styles.rad} ${visibility === 'full' ? styles.radOn : ''}`} />
              Show full report
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'score'}
              className={styles.row}
              onClick={() => setVisibility('score')}
            >
              <div className={`${styles.rad} ${visibility === 'score' ? styles.radOn : ''}`} />
              Score only
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'hidden'}
              className={styles.row}
              style={{ marginBottom: 4 }}
              onClick={() => setVisibility('hidden')}
            >
              <div className={`${styles.rad} ${visibility === 'hidden' ? styles.radOn : ''}`} />
              Hidden (instructor only)
            </button>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>Submission Rules</span>
            <div className={styles.dividerLine} />
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={autoAnalyze}
            className={styles.row}
            onClick={() => setAutoAnalyze((v) => !v)}
          >
            <div className={`${styles.chk} ${autoAnalyze ? styles.chkOn : ''}`}>
              {autoAnalyze ? '✓' : ''}
            </div>
            Auto-analyze on submit
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={requireEula}
            className={styles.row}
            onClick={() => setRequireEula((v) => !v)}
          >
            <div className={`${styles.chk} ${requireEula ? styles.chkOn : ''}`}>
              {requireEula ? '✓' : ''}
            </div>
            Require EULA
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={allowResubmission}
            className={styles.row}
            onClick={() => setAllowResubmission((v) => !v)}
          >
            <div className={`${styles.chk} ${allowResubmission ? styles.chkOn : ''}`}>
              {allowResubmission ? '✓' : ''}
            </div>
            Allow resubmission
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={emailOnFlag}
            className={styles.row}
            style={{ marginBottom: 4 }}
            onClick={() => setEmailOnFlag((v) => !v)}
          >
            <div className={`${styles.chk} ${emailOnFlag ? styles.chkOn : ''}`}>
              {emailOnFlag ? '✓' : ''}
            </div>
            Email on flag
          </button>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>Exclusions</span>
            <div className={styles.dividerLine} />
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={excludeBibliography}
            className={styles.row}
            onClick={() => setExcludeBibliography((v) => !v)}
          >
            <div className={`${styles.chk} ${excludeBibliography ? styles.chkOn : ''}`}>
              {excludeBibliography ? '✓' : ''}
            </div>
            Exclude bibliography
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={excludeQuotedText}
            className={styles.row}
            onClick={() => setExcludeQuotedText((v) => !v)}
          >
            <div className={`${styles.chk} ${excludeQuotedText ? styles.chkOn : ''}`}>
              {excludeQuotedText ? '✓' : ''}
            </div>
            Exclude quoted text
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={excludeSmallMatches}
            className={styles.row}
            onClick={() => setExcludeSmallMatches((v) => !v)}
          >
            <div className={`${styles.chk} ${excludeSmallMatches ? styles.chkOn : ''}`}>
              {excludeSmallMatches ? '✓' : ''}
            </div>
            Exclude small matches
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={excludeCourseMaterials}
            className={styles.row}
            style={{ marginBottom: 12 }}
            onClick={() => setExcludeCourseMaterials((v) => !v)}
          >
            <div className={`${styles.chk} ${excludeCourseMaterials ? styles.chkOn : ''}`}>
              {excludeCourseMaterials ? '✓' : ''}
            </div>
            Exclude course materials
          </button>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>Recent Activity</span>
            <div className={styles.dividerLine} />
          </div>
          <div className={styles.activityList}>
            <div className={styles.activityRow}>
              <span>J. Martinez submitted</span>
              <span className={styles.activityMeta}>2 h ago</span>
            </div>
            <div className={`${styles.activityRow} ${styles.activityFlagged}`}>
              <span>⚠ A. Chen flagged (72%)</span>
              <span className={styles.activityMeta}>4 h ago</span>
            </div>
            <div className={styles.activityRow}>
              <span>K. Johnson analyzed</span>
              <span className={styles.activityMeta}>5 h ago</span>
            </div>
          </div>

          <a href="/lti/assetprocessor/reports" className={`${styles.btn} ${styles.btnLink}`}>
            → View All Reports
          </a>

          {saveError && <div className={styles.saveError}>{saveError}</div>}

          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleDiscard}
            disabled={isSaving}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemConfigPanel;
