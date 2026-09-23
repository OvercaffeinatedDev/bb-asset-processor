'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { getIndicationColor } from '@/lib/utils/assetReport';

import { dmSans, spaceMono } from '../config/fonts';
import styles from './reportsListPanel.module.css';

export interface ReportListRow {
  id: string;
  userId: string;
  title: string;
  submittedAtDisplay: string;
  score: number;
  reviewStatus: 'under_review' | 'posted';
}

interface ReportsListPanelProps {
  rows: ReportListRow[];
  subtitle: string;
}

type Filter = 'all' | 'pending' | 'clean' | 'warning' | 'flagged';

const similarityBucket = (score: number): 'clean' | 'warning' | 'flagged' => {
  if (score <= 30) return 'clean';
  if (score <= 70) return 'warning';
  return 'flagged';
};

const BUCKET_LABEL: Record<'clean' | 'warning' | 'flagged', string> = {
  clean: 'Clean',
  warning: 'Warning',
  flagged: 'Flagged',
};

// Ported from the "Reports List" wireframe (Screen 4 of 5):
// https://claude.ai/design/p/48f10ec3-edf6-4629-bd10-70a43b1b3a4b
// Filter chips mix two dimensions the same way the wireframe does — Pending
// is a review-status filter, Clean/Warning/Flagged are similarity-score
// buckets — a row can match more than one criterion, the chips just narrow
// by whichever one is selected.
const ReportsListPanel = ({ rows, subtitle }: ReportsListPanelProps) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, clean: 0, warning: 0, flagged: 0 };
    for (const row of rows) {
      if (row.reviewStatus === 'under_review') c.pending += 1;
      c[similarityBucket(row.score)] += 1;
    }
    return c;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'pending' && row.reviewStatus !== 'under_review') return false;
      if (filter !== 'all' && filter !== 'pending' && similarityBucket(row.score) !== filter) {
        return false;
      }
      if (term && !row.userId.toLowerCase().includes(term) && !row.title.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'clean', label: 'Clean', count: counts.clean },
    { key: 'warning', label: 'Warning', count: counts.warning },
    { key: 'flagged', label: 'Flagged', count: counts.flagged },
  ];

  const chipColor = (key: Filter): string => {
    switch (key) {
      case 'clean':
        return 'var(--gn)';
      case 'warning':
        return 'var(--am)';
      case 'flagged':
        return 'var(--rd)';
      case 'pending':
        return 'var(--t2)';
      default:
        return 'var(--ac)';
    }
  };

  return (
    <div className={`${styles.panel} ${dmSans.variable} ${spaceMono.variable}`}>
      <div className={styles.frame}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.title}>Similarity Reports</div>
            <div className={styles.subtitle}>{subtitle}</div>
          </div>
          <div className={styles.actions}>
            <div className={styles.searchField}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                placeholder="Search student…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className={styles.iconBtn}>
              ⇩ Export CSV
            </button>
            <button type="button" className={styles.iconBtn}>
              ⚙ Settings
            </button>
          </div>
        </div>

        <div className={styles.filterBar}>
          <span className={styles.filterLabel}>Filter:</span>
          {chips.map((chip) => {
            const active = filter === chip.key;
            const color = chipColor(chip.key);
            return (
              <button
                key={chip.key}
                type="button"
                className={styles.chip}
                onClick={() => setFilter(chip.key)}
                style={
                  active
                    ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color, borderColor: color }
                    : undefined
                }
              >
                {chip.label} ({chip.count})
              </button>
            );
          })}
          <span className={styles.sortHint}>
            Sort: <span className={styles.sortValue}>Submitted ↓</span>
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Assignment</th>
                <th>Submitted</th>
                <th>Similarity %</th>
                <th>Status</th>
                <th>Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const bucket = similarityBucket(row.score);
                const color = getIndicationColor(row.score);
                return (
                  <tr key={row.id}>
                    <td className={styles.studentCell}>{row.userId}</td>
                    <td>{row.title}</td>
                    <td>{row.submittedAtDisplay}</td>
                    <td>
                      <span className={styles.scoreCell} style={{ color }}>
                        {row.score}%
                      </span>
                    </td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{
                          background: `color-mix(in srgb, ${color} 15%, transparent)`,
                          color,
                          borderColor: color,
                        }}
                      >
                        {BUCKET_LABEL[bucket]}
                      </span>
                    </td>
                    <td>
                      {row.reviewStatus === 'under_review' ? (
                        <span
                          className={styles.badge}
                          style={{ background: 'var(--sur2)', color: 'var(--t3)', borderColor: 'var(--bd2)' }}
                        >
                          Pending
                        </span>
                      ) : (
                        <span
                          className={styles.badge}
                          style={{ background: 'rgba(69,196,122,.12)', color: 'var(--gn)', borderColor: 'var(--gn)' }}
                        >
                          Reviewed
                        </span>
                      )}
                    </td>
                    <td>
                      <Link href={`/lti/assetprocessor/reports/${row.id}`} className={styles.viewLink}>
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <div className={styles.emptyState}>
              {rows.length === 0
                ? 'No submissions yet.'
                : 'No submissions match the current filter/search.'}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span>
            Showing {filteredRows.length} of {rows.length} submission{rows.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReportsListPanel;
