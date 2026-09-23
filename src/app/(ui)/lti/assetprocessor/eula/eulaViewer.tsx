'use client';

import { useEffect, useRef, useState } from 'react';

import { dmSans, spaceMono } from '../config/fonts';
import styles from './eula.module.css';

interface EulaViewerProps {
  returnUrl: string;
  callState: string;
  platformOrigin: string | null;
}

interface EulaSection {
  label: string;
  title: string;
  subtitle: string;
  paragraphs: { text: string; variant?: 'callout' | 'muted' }[];
}

// Ported from the "Student EULA" wireframe (Screen 3 of 5):
// https://claude.ai/design/p/48f10ec3-edf6-4629-bd10-70a43b1b3a4b
// 5 steps: 4 EULA sections (scroll-locked — Next stays disabled until the
// student has scrolled a section to the end) + a final Confirm step where
// Next becomes Submit. There's no real EULA copy yet, so the text below is
// placeholder literature standing in for it.
const SECTIONS: EulaSection[] = [
  {
    label: 'Overview',
    title: '1. Overview',
    subtitle: 'Section 1 of 4 — please read in full before continuing',
    paragraphs: [
      {
        text: 'This course uses an automated similarity-detection service as part of its assignment submission process. When you submit an assignment through this integration, your work is automatically sent to an analysis system that compares it against a broad range of reference sources to detect potential overlap with existing work.',
      },
      {
        text: "This agreement explains how your submission is used, what data is collected, how long it's kept, and what rights you retain over your own work. You'll need to read each section before continuing — the Next button unlocks once you've reached the end of a section.",
      },
    ],
  },
  {
    label: 'Data Use',
    title: '2. Data Use',
    subtitle: 'Section 2 of 4 — please read in full before continuing',
    paragraphs: [
      {
        text: 'Your submission — including its full text, associated metadata (such as file name, submission time, and course context), and document structure — is transmitted securely to the analysis provider for processing.',
      },
      {
        text: 'This data is used solely to generate a similarity report for your instructor. It is not used for advertising, profiling, or any purpose unrelated to plagiarism detection, and is not sold to third parties.',
        variant: 'callout',
      },
      {
        text: 'Only your instructor and authorized institution staff can view the resulting similarity report. The analysis provider does not have access to your identity beyond what is required to process the submission.',
      },
    ],
  },
  {
    label: 'Privacy',
    title: '3. Privacy & Data Retention',
    subtitle: 'Section 3 of 4 — please read in full before continuing',
    paragraphs: [
      {
        text: 'Your submission will be processed by an automated similarity analysis system. The content of your work — including full text, metadata, and document structure — will be transmitted securely to the analysis provider.',
      },
      {
        text: 'Data retention period: submissions are stored for up to 7 years to maintain the integrity of the plagiarism detection database. After this period, your submission will be permanently deleted.',
      },
      {
        text: 'Your personal information (name, student ID) is stored separately from your submission text and is not shared with other institutions or used to train AI models outside of this service.',
        variant: 'callout',
      },
    ],
  },
  {
    label: 'Rights',
    title: '4. Your Rights',
    subtitle: 'Section 4 of 4 — please read in full before continuing',
    paragraphs: [
      {
        text: 'You retain copyright over all original work you submit. The provider is granted a limited, non-exclusive license to process and index your submission solely for plagiarism detection purposes.',
      },
      {
        text: "You have the right to request deletion of your data by contacting your institution's data privacy officer. Deletion requests may affect the accuracy of future similarity checks on related submissions.",
      },
      {
        text: 'If you have questions about how your data is handled, or wish to revoke your consent after accepting, contact your course instructor or your institution\'s data privacy office.',
        variant: 'muted',
      },
    ],
  },
];

const TOTAL_STEPS = SECTIONS.length + 1; // 4 sections + confirm
const CONFIRM_STEP = SECTIONS.length; // index 4

const EulaViewer = ({ returnUrl, callState, platformOrigin }: EulaViewerProps) => {
  const [step, setStep] = useState(0);
  const [readSteps, setReadSteps] = useState<boolean[]>(() => Array(SECTIONS.length).fill(false));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  const isConfirmStep = step === CONFIRM_STEP;
  const currentSection = isConfirmStep ? null : SECTIONS[step];
  const isCurrentStepRead = isConfirmStep || readSteps[step];

  const markStepRead = (index: number) => {
    setReadSteps((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  // A section shorter than the box (nothing to scroll) is trivially "read".
  useEffect(() => {
    if (isConfirmStep) return;
    const el = docRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 1) {
      markStepRead(step);
    }
  }, [step, isConfirmStep]);

  const handleScroll = () => {
    const el = docRef.current;
    if (!el) return;
    const reachedEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (reachedEnd) markStepRead(step);
  };

  const closeLtiModal = () => {
    const target = window.opener || window.parent;
    // Use the known platform origin when available; fall back to '*' only if missing
    target.postMessage({ subject: 'lti.close' }, platformOrigin ?? '*');
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const goNext = () => {
    if (!isCurrentStepRead) return;
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const acceptAndClose = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/lti/eula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: callState, returnUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit acceptance. Please try again.');
        return;
      }

      closeLtiModal();
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const refuseAndClose = () => {
    closeLtiModal();
  };

  return (
    <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
      <div className={styles.frame}>
        <div className={styles.topbar}>
          <span className={styles.tbT}>Terms of Service</span>
          <span className={styles.tbS}>
            — Read all sections before submitting your assignment
          </span>
        </div>

        <div className={styles.stepsBar}>
          {SECTIONS.map((section, i) => {
            const isDoneVisited = i < step;
            const isOn = i === step && !isConfirmStep;
            return (
              <div className={styles.step} key={section.label}>
                {i < SECTIONS.length - 1 && <div className={styles.stepLine} />}
                <div
                  className={`${styles.sdot} ${isDoneVisited ? styles.sdotDone : ''} ${isOn ? styles.sdotOn : ''}`}
                >
                  {isDoneVisited ? '✓' : i + 1}
                </div>
                <div className={styles.slbl}>{section.label}</div>
              </div>
            );
          })}
          <div className={styles.step}>
            <div className={styles.stepLine} />
            <div className={`${styles.sdot} ${isConfirmStep ? styles.sdotOn : step > CONFIRM_STEP ? styles.sdotDone : ''}`}>
              {step > CONFIRM_STEP ? '✓' : SECTIONS.length + 1}
            </div>
            <div className={styles.slbl}>Confirm</div>
          </div>
        </div>

        <div className={styles.body}>
          {!isConfirmStep && currentSection && (
            <>
              <div className={styles.sectionTitle}>{currentSection.title}</div>
              <div className={styles.sectionSub}>{currentSection.subtitle}</div>

              <div className={styles.doc} ref={docRef} onScroll={handleScroll}>
                {currentSection.paragraphs.map((p, i) => (
                  <div
                    key={i}
                    className={`${styles.docP} ${p.variant === 'callout' ? styles.docPCallout : ''} ${p.variant === 'muted' ? styles.docPMuted : ''}`}
                  >
                    {p.text}
                  </div>
                ))}
                {!isCurrentStepRead && (
                  <div className={styles.sfade}>
                    <span className={styles.sfadeHint}>↓ scroll to continue</span>
                  </div>
                )}
              </div>

              <div className={styles.actionsRow}>
                <div className={`${styles.lockHint} ${isCurrentStepRead ? styles.unlocked : ''}`}>
                  <span>{isCurrentStepRead ? '🔓' : '🔒'}</span>
                  <span>{isCurrentStepRead ? 'Section read' : 'Scroll to end to unlock'}</span>
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={goBack}
                    disabled={step === 0}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={goNext}
                    disabled={!isCurrentStepRead}
                  >
                    {isCurrentStepRead ? 'Next →' : 'Next → (locked)'}
                  </button>
                </div>
              </div>

              {step === SECTIONS.length - 1 && (
                <div className={styles.infoBox}>
                  ℹ Formal Accept / Decline appears on the final Confirm screen ({TOTAL_STEPS} of {TOTAL_STEPS})
                </div>
              )}
            </>
          )}

          {isConfirmStep && (
            <>
              <div className={styles.sectionTitle}>5. Confirm</div>
              <div className={styles.sectionSub}>
                You&apos;ve read all sections — accept or decline the terms below to continue.
              </div>

              <div className={styles.confirmSummary}>
                {SECTIONS.map((section) => (
                  <div className={styles.confirmRow} key={section.label}>
                    <span className={styles.confirmCheck}>✓</span>
                    <span>{section.title} reviewed</span>
                  </div>
                ))}
              </div>

              {error && <div className={styles.errorMsg}>{error}</div>}

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={goBack}
                  disabled={pending}
                >
                  ← Back
                </button>
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={refuseAndClose}
                    disabled={pending}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={acceptAndClose}
                    disabled={pending}
                  >
                    {pending ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EulaViewer;
