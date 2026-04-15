import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts'
import './ScoreHistory.css'

const STORAGE_KEY = 'hireready-history'
const APPLIED_KEY = 'hireready-applied'
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
  localStorage.removeItem(APPLIED_KEY)
}

/** Load the set of "applied" entry IDs. */
function loadApplied() {
  try {
    return new Set(JSON.parse(localStorage.getItem(APPLIED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

/** Toggle the "applied" flag for a given entry ID. Returns updated Set. */
function toggleApplied(id) {
  const applied = loadApplied()
  if (applied.has(id)) {
    applied.delete(id)
  } else {
    applied.add(id)
  }
  localStorage.setItem(APPLIED_KEY, JSON.stringify([...applied]))
  return applied
}

/** Export history entries as a CSV string and trigger download. */
function exportCSV(entries) {
  const headers = ['Date', 'Resume File', 'Overall Score', 'Keyword Match', 'Skills', 'Experience', 'Education', 'Mode']
  const rows = entries.map((e) => [
    new Date(e.timestamp).toLocaleString(),
    e.resumeFileName,
    e.overall_score,
    e.keyword_match_score ?? '',
    e.skills_score ?? '',
    e.experience_score ?? '',
    e.education_score ?? '',
    e.mode ?? '',
  ])
  const csv = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = 'hireready-history.csv'
  link.click()
  URL.revokeObjectURL(url)
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
const UNDO_DURATION = 5000   // ms — how long the undo window stays open

export default function ScoreHistory({ entries, onRestore, onDelete, onClear }) {
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState(() => loadApplied())
  const [showConfirm, setShowConfirm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [clearPending, setClearPending] = useState(false)
  const undoTimerRef = useRef(null)

  // Single-entry delete: { id, resumeFileName } while confirm dialog is open
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  // Single-entry delete undo: { id, resumeFileName } during 5s window
  const [deletePending, setDeletePending] = useState(null)
  const deleteTimerRef = useRef(null)

  if (!entries || entries.length === 0) return null

  // Find the highest overall score for the crown badge
  const bestScore = Math.max(...entries.map((e) => e.overall_score))

  // Build sparkline data (oldest → newest)
  const chartData = [...entries].reverse().map((e, i) => ({
    idx: i + 1,
    score: e.overall_score,
  }))

  function handleToggleApplied(id) {
    const next = toggleApplied(id)
    setApplied(new Set(next))
  }

  // ── Single-entry delete ──────────────────────────────────────────────
  function handleDeleteRequest(id, resumeFileName) {
    // If another delete is already pending, finalise it first
    if (deletePending) {
      clearTimeout(deleteTimerRef.current)
      onDelete(deletePending.id)
      setDeletePending(null)
    }
    setDeleteConfirm({ id, resumeFileName })
  }

  function handleConfirmDelete() {
    const { id, resumeFileName } = deleteConfirm
    setDeleteConfirm(null)
    setDeletePending({ id, resumeFileName })
    deleteTimerRef.current = setTimeout(() => {
      setDeletePending(null)
      onDelete(id)
    }, UNDO_DURATION)
  }

  function handleUndoDelete() {
    clearTimeout(deleteTimerRef.current)
    setDeletePending(null)
  }

  // Export CSV — confirm before downloading
  function handleExportRequest() {
    setShowExportConfirm(true)
  }

  function handleConfirmExport() {
    setShowExportConfirm(false)
    exportCSV(entries)
  }

  // Step 1 — user clicks "Clear history" → show confirm dialog
  function handleClearRequest() {
    setShowConfirm(true)
  }

  // Step 2 — user confirms → enter undo window (DON'T call onClear yet)
  function handleConfirmClear() {
    setShowConfirm(false)
    setClearPending(true)
    undoTimerRef.current = setTimeout(() => {
      setClearPending(false)
      onClear()                   // permanent delete fires only after undo window
    }, UNDO_DURATION)
  }

  // Step 2b — user cancels the confirm dialog
  function handleCancelClear() {
    setShowConfirm(false)
  }

  // Step 3a — user clicks Undo → cancel timer, restore normal view
  function handleUndo() {
    clearTimeout(undoTimerRef.current)
    setClearPending(false)
    // entries were never deleted from App state, so list just reappears
  }

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

      {/* ── Single-entry delete confirmation ── */}
      {deleteConfirm && createPortal(
        <div className="history-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="history-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="history-confirm-msg">🗑️ Delete this entry?<br/><span className="history-confirm-filename">{deleteConfirm.resumeFileName}</span></p>
            <div className="history-confirm-actions">
              <button className="history-confirm-cancel" onClick={() => setDeleteConfirm(null)} type="button">Cancel</button>
              <button className="history-confirm-ok" onClick={handleConfirmDelete} type="button">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Export CSV confirmation ── */}
      {showExportConfirm && createPortal(
        <div className="history-confirm-overlay" onClick={() => setShowExportConfirm(false)}>
          <div className="history-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="history-confirm-msg">⬇️ Export history as CSV?<br/><span>All {entries.length} run{entries.length !== 1 ? 's' : ''} will be saved to a .csv file on your device.</span></p>
            <div className="history-confirm-actions">
              <button className="history-confirm-cancel" onClick={() => setShowExportConfirm(false)} type="button">Cancel</button>
              <button className="history-confirm-ok history-confirm-ok--export" onClick={handleConfirmExport} type="button">Export</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Clear history confirmation — portalled to body so fixed overlay covers full viewport ── */}
      {showConfirm && createPortal(
        <div className="history-confirm-overlay" onClick={handleCancelClear}>
          <div className="history-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="history-confirm-msg">🗑️ Clear all history?<br/><span>You'll have 5 seconds to undo before it's gone permanently.</span></p>
            <div className="history-confirm-actions">
              <button className="history-confirm-cancel" onClick={handleCancelClear} type="button">Cancel</button>
              <button className="history-confirm-ok" onClick={handleConfirmClear} type="button">Clear</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {open && (
        <div className="history-body">

          {/* ── Clear-all undo toast (replaces list during 5s window) ── */}
          {clearPending && (
            <div className="history-undo-wrap">
              <div className="history-undo-text">History cleared.</div>
              <button className="history-undo-btn" onClick={handleUndo} type="button">↩ Undo</button>
              {/* Countdown bar — re-keyed so animation restarts fresh */}
              <div className="history-undo-bar-track">
                <div key="undo-bar" className="history-undo-bar-fill" />
              </div>
            </div>
          )}

          {/* Score trend sparkline — hidden while undo is pending */}
          {!clearPending && entries.length >= 2 && (
            <div className="history-chart-wrap">
              <span className="history-chart-label">Score Trend</span>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={chartData}>
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(v) => [`${v}`, 'Score']}
                    labelFormatter={() => ''}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className={`history-list${clearPending ? ' history-list--hidden' : ''}`}>
            {entries.map((entry) => {
              const isBest    = entry.overall_score === bestScore
              const isApplied = applied.has(entry.id)

              // Replace the pending-delete entry with an inline undo row
              if (deletePending?.id === entry.id) {
                return (
                  <div key={entry.id} className="history-entry history-entry--undo">
                    <div className="history-undo-inline-text">
                      🗑️ <span title={entry.resumeFileName}>
                        {entry.resumeFileName.length > 30
                          ? entry.resumeFileName.slice(0, 30) + '…'
                          : entry.resumeFileName}
                      </span> deleted.
                    </div>
                    <button className="history-undo-btn" onClick={handleUndoDelete} type="button">↩ Undo</button>
                    <div className="history-undo-bar-track history-undo-bar-track--inline">
                      <div key={`del-${entry.id}`} className="history-undo-bar-fill" />
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={entry.id}
                  className={`history-entry${isBest ? ' history-entry--best' : ''}${isApplied ? ' history-entry--applied' : ''}`}
                >
                  <div className="history-entry-left">
                    {/* Best score crown */}
                    {isBest && <span className="history-crown" title="Best score">👑</span>}

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
                      <div className="history-meta-row">
                        <span className="history-date">
                          {new Date(entry.timestamp).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {/* Applied tag */}
                        <button
                          className={`history-applied-tag ${isApplied ? 'history-applied-tag--active' : ''}`}
                          onClick={() => handleToggleApplied(entry.id)}
                          type="button"
                          title={isApplied ? 'Mark as not applied' : 'Mark as applied'}
                        >
                          {isApplied ? '✅ Applied' : '＋ Applied?'}
                        </button>
                      </div>
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
                      onClick={() => handleDeleteRequest(entry.id, entry.resumeFileName)}
                      type="button"
                      title="Remove this entry"
                      aria-label="Delete entry"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {!clearPending && (
            <div className="history-footer">
              <button className="history-export-btn" onClick={handleExportRequest} type="button">
                ⬇ Export CSV
              </button>
              <button className="history-clear-btn" onClick={handleClearRequest} type="button">
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
