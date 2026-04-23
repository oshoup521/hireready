import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts'
import './ScoreHistory.css'

const STORAGE_KEY  = 'hireready-history'
const STATUS_KEY   = 'hireready-status'   // replaces old APPLIED_KEY
const MAX_ENTRIES  = 10

// Status cycle order — null means not tracking
const STATUS_CYCLE = [null, 'applied', 'interview', 'offer', 'rejected']
const STATUS_META  = {
  applied:   { label: 'Applied',   emoji: '📤', color: 'var(--accent)'   },
  interview: { label: 'Interview', emoji: '📅', color: 'var(--warning)'  },
  offer:     { label: 'Offer 🎉',  emoji: '',   color: 'var(--success)'  },
  rejected:  { label: 'Rejected',  emoji: '✗',  color: 'var(--danger)'   },
}

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
  localStorage.removeItem(STATUS_KEY)
}

/** Load the status map { [id]: 'applied'|'interview'|'offer'|'rejected' }. */
function loadStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Advance the status for a given entry ID along STATUS_CYCLE. */
function advanceStatus(id) {
  const statuses = loadStatuses()
  const current  = statuses[id] || null
  const idx      = STATUS_CYCLE.indexOf(current)
  // Cycle forward, wrapping null (last item) back to null (removes key)
  const next     = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
  if (next === null) {
    delete statuses[id]
  } else {
    statuses[id] = next
  }
  localStorage.setItem(STATUS_KEY, JSON.stringify(statuses))
  return statuses
}

/** Directly set a status (e.g. jump to 'rejected'). */
function setStatus(id, status) {
  const statuses = loadStatuses()
  if (status === null) {
    delete statuses[id]
  } else {
    statuses[id] = status
  }
  localStorage.setItem(STATUS_KEY, JSON.stringify(statuses))
  return statuses
}

/** Open a print-ready HTML page with the full history table and trigger print. */
function exportPDF(entries) {
  const statuses = loadStatuses()
  const rows = entries.map((e) => {
    const status = statuses[e.id] || '—'
    const scoreColor = e.overall_score >= 75 ? '#2e7d52' : e.overall_score >= 50 ? '#b57a00' : '#c0392b'
    return `
      <tr>
        <td>${new Date(e.timestamp).toLocaleString()}</td>
        <td>${e.resumeFileName}</td>
        <td style="color:${scoreColor};font-weight:700">${e.overall_score}</td>
        <td>${e.keyword_match_score ?? '—'}</td>
        <td>${e.skills_score ?? '—'}</td>
        <td>${e.experience_score ?? '—'}</td>
        <td>${e.education_score ?? '—'}</td>
        <td>${e.mode === 'ats_vs_jd' ? 'ATS vs JD' : 'ATS Only'}</td>
        <td>${status}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>HireReady — Score History</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; font-size: 13px; color: #1a1a1a; padding: 2rem; }
    h1 { font-size: 1.3rem; margin-bottom: 0.25rem; color: #6c63ff; }
    p  { font-size: 0.8rem; color: #666; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.72rem;
         text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #ddd; }
    td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #fafafa; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>HireReady — Score History</h1>
  <p>Exported ${new Date().toLocaleString()} · ${entries.length} run${entries.length !== 1 ? 's' : ''}</p>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Resume File</th><th>Score</th><th>Keywords</th>
        <th>Skills</th><th>Experience</th><th>Education</th><th>Mode</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  // Slight delay so the page renders before print dialog opens
  setTimeout(() => { w.print() }, 300)
}

/** Export history entries as a CSV string and trigger download. */
function exportCSV(entries) {
  const statuses = loadStatuses()
  const headers = ['Date', 'Resume File', 'Overall Score', 'Keyword Match', 'Skills', 'Experience', 'Education', 'Mode', 'Status']
  const rows = entries.map((e) => [
    new Date(e.timestamp).toLocaleString(),
    e.resumeFileName,
    e.overall_score,
    e.keyword_match_score ?? '',
    e.skills_score ?? '',
    e.experience_score ?? '',
    e.education_score ?? '',
    e.mode ?? '',
    statuses[e.id] ?? '',
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
  const [statuses, setStatuses] = useState(() => loadStatuses())
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

  function handleAdvanceStatus(id) {
    setStatuses(advanceStatus(id))
  }

  function handleSetRejected(id) {
    setStatuses(setStatus(id, 'rejected'))
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
              const isBest      = entry.overall_score === bestScore
              const entryStatus = statuses[entry.id] || null
              const statusInfo  = entryStatus ? STATUS_META[entryStatus] : null

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
                  className={`history-entry${isBest ? ' history-entry--best' : ''}${entryStatus ? ` history-entry--${entryStatus}` : ''}`}
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
                        {/* Status tracker pill */}
                        <button
                          className={`history-status-btn${entryStatus ? ` history-status-btn--${entryStatus}` : ''}`}
                          onClick={() => handleAdvanceStatus(entry.id)}
                          type="button"
                          title="Cycle status: Track → Applied → Interview → Offer → clear"
                          style={statusInfo ? { borderColor: statusInfo.color, color: statusInfo.color } : {}}
                        >
                          {statusInfo ? `${statusInfo.emoji} ${statusInfo.label}`.trim() : '＋ Track'}
                        </button>
                        {/* Quick reject — only shown when actively tracking but not yet concluded */}
                        {(entryStatus === 'applied' || entryStatus === 'interview') && (
                          <button
                            className="history-reject-btn"
                            onClick={() => handleSetRejected(entry.id)}
                            type="button"
                            title="Mark as rejected"
                          >✗</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="history-entry-actions">
                    <button
                      className="history-restore-btn"
                      onClick={() => { onRestore(entry.report, entry.id); setOpen(false) }}
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
                ⬇ CSV
              </button>
              <button className="history-export-btn history-export-btn--pdf" onClick={() => exportPDF(entries)} type="button">
                🖨 PDF
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
