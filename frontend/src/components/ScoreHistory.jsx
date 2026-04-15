import { useState } from 'react'
import './ScoreHistory.css'

const STORAGE_KEY = 'hireready-history'
const MAX_ENTRIES = 10

/* ── Public helpers used by App.jsx ── */

/** Load all history entries from localStorage. Returns [] if empty/corrupt. */
export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/** Save a new analysis result to history (FIFO, max MAX_ENTRIES). */
export function saveToHistory(report, resumeFileName) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    resumeFileName,
    overall_score: report.overall_score,
    keyword_match_score: report.keyword_match_score ?? null,
    skills_score: report.skills_score,
    experience_score: report.experience_score,
    education_score: report.education_score,
    mode: report.mode,
    report,   // full report snapshot
  }
  const existing = loadHistory()
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

/** Clear all history entries. */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Delete a single history entry by id. Returns the updated list. */
export function deleteHistoryEntry(id) {
  const updated = loadHistory().filter((e) => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

/* ── Score badge colour helper ── */
function scoreColor(score) {
  if (score >= 75) return 'var(--success)'
  if (score >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

/**
 * ScoreHistory — collapsible panel that shows past analysis runs.
 *
 * Props:
 *   entries      {Array}     History entries from localStorage
 *   onRestore    {Function}  Called with the full report object to re-display it
 *   onDelete     {Function}  Called with entry id to remove a single entry
 *   onClear      {Function}  Called when user clears all history
 */
export default function ScoreHistory({ entries, onRestore, onDelete, onClear }) {
  const [open, setOpen] = useState(false)

  if (!entries || entries.length === 0) return null

  return (
    <div className="score-history card">
      <button
        className="history-toggle"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="history-toggle-label">
          🕒 Past Scores
          <span className="history-count">{entries.length}</span>
        </span>
        <span className="history-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="history-body">
          <div className="history-list">
            {entries.map((entry) => (
              <div key={entry.id} className="history-entry">
                <div className="history-entry-left">
                  {/* Score bubble */}
                  <span
                    className="history-score"
                    style={{ color: scoreColor(entry.overall_score) }}
                  >
                    {entry.overall_score}
                  </span>

                  {/* File + date info */}
                  <div className="history-meta">
                    <span className="history-filename" title={entry.resumeFileName}>
                      {entry.resumeFileName}
                    </span>
                    <span className="history-date">
                      {new Date(entry.timestamp).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="history-entry-actions">
                  <button
                    className="history-restore-btn"
                    onClick={() => { onRestore(entry.report); setOpen(false) }}
                    type="button"
                    title="Re-display this report"
                  >
                    View
                  </button>
                  <button
                    className="history-delete-btn"
                    onClick={() => onDelete(entry.id)}
                    type="button"
                    title="Remove this entry"
                    aria-label="Delete entry"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button className="history-clear-btn" onClick={onClear} type="button">
            Clear history
          </button>
        </div>
      )}
    </div>
  )
}
