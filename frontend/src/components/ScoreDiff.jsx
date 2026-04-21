import { useState } from 'react'
import './ScoreDiff.css'

/* Build a delta object for one numeric metric. Returns null if either side is missing. */
function delta(current, previous) {
  if (current == null || previous == null) return null
  const diff = current - previous
  return { current, previous, diff }
}

/* Array set operations for keyword diffs */
function arrayDiff(currentArr = [], previousArr = []) {
  const prev = new Set(previousArr)
  const curr = new Set(currentArr)
  return {
    added:   currentArr.filter((k) => !prev.has(k)),
    removed: previousArr.filter((k) => !curr.has(k)),
  }
}

/* Render a single metric row with arrow + color-coded delta */
function MetricRow({ label, data }) {
  if (!data) return null
  const { current, previous, diff } = data
  const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '•'
  const sign = diff > 0 ? '+' : ''
  return (
    <div className="diff-metric-row">
      <span className="diff-metric-label">{label}</span>
      <span className="diff-metric-values">
        <span className="diff-prev">{previous}</span>
        <span className="diff-arrow-sep">→</span>
        <span className="diff-curr">{current}</span>
        <span className={`diff-chip diff-chip--${cls}`}>
          {arrow} {sign}{diff}
        </span>
      </span>
    </div>
  )
}

/**
 * ScoreDiff — Banner that compares the current report to the most recent previous run.
 *
 * Props:
 *   current  {object}   Current report
 *   previous {object}   Previous report (from history)
 *   previousLabel {string}  Short label for the previous entry (filename + time)
 */
export default function ScoreDiff({ current, previous, previousLabel }) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)

  if (!current || !previous || dismissed) return null

  const overall = delta(current.overall_score, previous.overall_score)
  const metrics = [
    { label: 'Overall',       data: delta(current.overall_score,      previous.overall_score) },
    { label: 'Keyword Match', data: delta(current.keyword_match_score, previous.keyword_match_score) },
    { label: 'Skills',        data: delta(current.skills_score,        previous.skills_score) },
    { label: 'Experience',    data: delta(current.experience_score,    previous.experience_score) },
    { label: 'Education',     data: delta(current.education_score,     previous.education_score) },
  ].filter((m) => m.data != null)

  const matchedDiff = arrayDiff(current.matched_keywords, previous.matched_keywords)
  const missingDiff = arrayDiff(current.missing_keywords, previous.missing_keywords)
  const sectionsDiff = arrayDiff(current.sections_found, previous.sections_found)

  // "New matches" = keywords you matched this time that you missed last time
  const newlyMatched = matchedDiff.added
  // "Lost matches" = keywords you matched before but not now
  const lostMatches  = matchedDiff.removed
  // "Still missing" & "newly missing" help surface gaps
  const newlyMissing = missingDiff.added

  const overallCls = overall.diff > 0 ? 'up' : overall.diff < 0 ? 'down' : 'same'
  const overallArrow = overall.diff > 0 ? '▲' : overall.diff < 0 ? '▼' : '•'
  const overallSign = overall.diff > 0 ? '+' : ''

  return (
    <div className={`score-diff score-diff--${overallCls}`}>
      <div className="diff-header">
        <div className="diff-header-left">
          <span className="diff-icon">{overall.diff > 0 ? '📈' : overall.diff < 0 ? '📉' : '🔁'}</span>
          <div className="diff-header-text">
            <div className="diff-title">
              Compared to previous run
              <span className={`diff-overall-chip diff-overall-chip--${overallCls}`}>
                {overallArrow} {overallSign}{overall.diff}
              </span>
            </div>
            {previousLabel && (
              <div className="diff-subtitle">vs. {previousLabel}</div>
            )}
          </div>
        </div>
        <div className="diff-header-actions">
          <button
            className="diff-toggle-btn"
            onClick={() => setExpanded((e) => !e)}
            type="button"
            aria-label={expanded ? 'Collapse diff' : 'Expand diff'}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            className="diff-close-btn"
            onClick={() => setDismissed(true)}
            type="button"
            aria-label="Dismiss diff"
            title="Hide comparison"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="diff-body">
          <div className="diff-metrics">
            {metrics.map((m) => (
              <MetricRow key={m.label} label={m.label} data={m.data} />
            ))}
          </div>

          {/* Keyword changes */}
          {(newlyMatched.length > 0 || lostMatches.length > 0 || newlyMissing.length > 0) && (
            <div className="diff-keywords">
              {newlyMatched.length > 0 && (
                <KeywordDiffGroup
                  icon="✅"
                  title={`New matches (${newlyMatched.length})`}
                  keywords={newlyMatched}
                  variant="added"
                />
              )}
              {lostMatches.length > 0 && (
                <KeywordDiffGroup
                  icon="⚠️"
                  title={`Matches lost (${lostMatches.length})`}
                  keywords={lostMatches}
                  variant="removed"
                />
              )}
              {newlyMissing.length > 0 && (
                <KeywordDiffGroup
                  icon="❌"
                  title={`Newly missing (${newlyMissing.length})`}
                  keywords={newlyMissing}
                  variant="removed"
                />
              )}
            </div>
          )}

          {/* Section changes */}
          {(sectionsDiff.added.length > 0 || sectionsDiff.removed.length > 0) && (
            <div className="diff-sections">
              {sectionsDiff.added.length > 0 && (
                <div className="diff-section-line diff-section-line--added">
                  <span>➕ Added sections:</span>{' '}
                  <strong>{sectionsDiff.added.join(', ')}</strong>
                </div>
              )}
              {sectionsDiff.removed.length > 0 && (
                <div className="diff-section-line diff-section-line--removed">
                  <span>➖ Removed sections:</span>{' '}
                  <strong>{sectionsDiff.removed.join(', ')}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KeywordDiffGroup({ icon, title, keywords, variant }) {
  const MAX = 15
  const shown = keywords.slice(0, MAX)
  const rest  = keywords.length - shown.length
  return (
    <div className="diff-kw-group">
      <div className="diff-kw-title">
        <span>{icon}</span> {title}
      </div>
      <div className="diff-kw-list">
        {shown.map((k) => (
          <span key={k} className={`diff-kw-pill diff-kw-pill--${variant}`}>{k}</span>
        ))}
        {rest > 0 && (
          <span className={`diff-kw-pill diff-kw-pill--${variant} diff-kw-pill--more`}>
            +{rest} more
          </span>
        )}
      </div>
    </div>
  )
}
