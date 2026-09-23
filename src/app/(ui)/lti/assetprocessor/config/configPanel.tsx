'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { submitConfig } from './actions';
import styles from './config.module.css';
import { dmSans, spaceMono } from './fonts';

type SubmissionMode = 'warn' | 'block';
type Visibility = 'full' | 'score' | 'hidden';

interface ConfigPanelProps {
  state: string;
  platformOrigin: string | null;
}

// Ported from the "LTI Configuration Panel" wireframe (Screen 1 of 5):
// https://claude.ai/design/p/48f10ec3-edf6-4629-bd10-70a43b1b3a4b
// Peek panel launched as an iFrame from Blackboard, instructor-only first-time setup.
//
// The form fields/toggles below (display name, thresholds, notifications, …) are
// still local-state only — there's no backend for persisting per-tool settings yet.
// Save Settings is wired: it completes the LTI Deep Linking handshake (see
// actions.ts) by signing an LtiDeepLinkingResponse and submitting it back to the
// platform's deep_link_return_url, which is what actually registers the Asset
// Processor against the assignment.
const ConfigPanel = ({ state, platformOrigin }: ConfigPanelProps) => {
  const apiKeyId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [displayName, setDisplayName] = useState('Similarity Checker');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.checker.io/v2');
  const [apiKey, setApiKey] = useState('sk_live_examplekey1234');
  const [showApiKey, setShowApiKey] = useState(false);

  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [requireEula, setRequireEula] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(false);

  const [threshold, setThreshold] = useState(60);
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('warn');

  const [visibility, setVisibility] = useState<Visibility>('full');

  const [emailInstructor, setEmailInstructor] = useState(true);
  const [notifyStudent, setNotifyStudent] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ returnUrl: string; jwt: string } | null>(null);

  // The platform's return URL expects a real browser-navigated form POST (per the
  // LTI Deep Linking spec), not a fetch/XHR — so once the server action hands back
  // a signed JWT, submit a hidden form to trigger that navigation.
  useEffect(() => {
    if (submission) {
      formRef.current?.requestSubmit();
    }
  }, [submission]);

  const closeLtiModal = () => {
    const target = window.opener || window.parent;
    target.postMessage({ subject: 'lti.close' }, platformOrigin ?? '*');
  };

  // Stub — no backend yet for persisting these per-tool settings.
  const handleTest = () => {};

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await submitConfig(state);
      if (!result.success || !result.returnUrl || !result.jwt) {
        setSaveError(result.error ?? 'Failed to save configuration. Please try again.');
        return;
      }
      setSubmission({ returnUrl: result.returnUrl, jwt: result.jwt });
      // Leaves isSaving true — the page is about to navigate away.
    } catch {
      setSaveError('A network error occurred. Please try again.');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    closeLtiModal();
  };

  return (
    <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
      <div className={styles.frame}>
        <div className={styles.topbar}>
          <span className={styles.gearIcon}>⚙</span>
          <div>
            <div className={styles.tbT}>Integration Setup</div>
            <div className={styles.tbS}>Similarity Checker · LTI 1.3</div>
          </div>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.statBar}>
            <div className={styles.statDot} />
            <span className={styles.statText}>Connected to API</span>
            <span className={styles.statMeta}>tested 2 h ago</span>
          </div>

          <label className={styles.lbl} htmlFor="displayName">
            Display Name
          </label>
          <div className={styles.field}>
            <input
              id="displayName"
              type="text"
              className={styles.fieldInput}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <label className={styles.lbl} htmlFor="apiEndpoint">
            API Endpoint URL
          </label>
          <div className={styles.field}>
            <input
              id="apiEndpoint"
              type="text"
              className={`${styles.fieldInput} ${styles.fieldInputSm}`}
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
            />
          </div>

          <div className={styles.apiKeyRow}>
            <div className={styles.apiKeyField}>
              <label className={styles.lbl} htmlFor={apiKeyId}>
                API Key
              </label>
              <div className={styles.field} style={{ marginBottom: 0 }}>
                <input
                  id={apiKeyId}
                  type={showApiKey ? 'text' : 'password'}
                  className={`${styles.fieldInput} ${styles.fieldInputMasked}`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.fieldIcon}
                  onClick={() => setShowApiKey((v) => !v)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  👁
                </button>
              </div>
            </div>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
              onClick={handleTest}
            >
              Test
            </button>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>Submission Behavior</span>
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
            Auto-analyze on submission
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
            Require EULA acceptance
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={allowResubmission}
            className={styles.row}
            style={{ marginBottom: 12 }}
            onClick={() => setAllowResubmission((v) => !v)}
          >
            <div className={`${styles.chk} ${allowResubmission ? styles.chkOn : ''}`}>
              {allowResubmission ? '✓' : ''}
            </div>
            Allow resubmission
          </button>

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
              style={{ marginBottom: 12 }}
              onClick={() => setVisibility('hidden')}
            >
              <div className={`${styles.rad} ${visibility === 'hidden' ? styles.radOn : ''}`} />
              Hidden (instructor only)
            </button>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>Notifications</span>
            <div className={styles.dividerLine} />
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={emailInstructor}
            className={styles.row}
            onClick={() => setEmailInstructor((v) => !v)}
          >
            <div className={`${styles.chk} ${emailInstructor ? styles.chkOn : ''}`}>
              {emailInstructor ? '✓' : ''}
            </div>
            Email instructor when flagged
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={notifyStudent}
            className={styles.row}
            style={{ marginBottom: 14 }}
            onClick={() => setNotifyStudent((v) => !v)}
          >
            <div className={`${styles.chk} ${notifyStudent ? styles.chkOn : ''}`}>
              {notifyStudent ? '✓' : ''}
            </div>
            Notify student on complete
          </button>

          {saveError && <div className={styles.saveError}>{saveError}</div>}

          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>

          {/* Submits the browser (not a fetch) to the platform's deep_link_return_url,
              carrying the signed LtiDeepLinkingResponse — see handleSave/useEffect above. */}
          <form ref={formRef} action={submission?.returnUrl} method="POST" hidden>
            <input type="hidden" name="JWT" value={submission?.jwt ?? ''} />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
