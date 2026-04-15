import { useState, useMemo } from 'react'
import './ResumeTextViewer.css'

// ---------------------------------------------------------------------------
// Annotation engine
// ---------------------------------------------------------------------------

const PRIORITY = { matched: 3, missing: 2, weak: 2, strong: 1 }

/**
 * Annotate a single string with keyword/verb highlight tags.
 * Returns an array of { text, type } segments where type is one of:
 *   'matched' | 'missing' | 'weak' | 'strong' | null (plain)
 *
 * Longer patterns are applied first so "machine learning" beats "learning".
 */
function annotateText(text, { matched = [], missing = [], weak = [], strong = [] }) {
  const lower = text.toLowerCase()
  const len   = text.length
  const tags  = new Array(len).fill(null)

  const patterns = [
    ...matched.map(k => [k.toLowerCase(), 'matched']),
    ...missing.map(k => [k.toLowerCase(), 'missing']),
    ...weak   .map(k => [k.toLowerCase(), 'weak']),
    ...strong .map(k => [k.toLowerCase(), 'strong']),
  ].sort((a, b) => b[0].length - a[0].length)   // longest first

  for (const [kw, type] of patterns) {
    let idx = 0
    while ((idx = lower.indexOf(kw, idx)) !== -1) {
      const end = idx + kw.length
      // Only write if no higher-priority annotation already occupies this range
      let blocked = false
      for (let i = idx; i < end; i++) {
        if (tags[i] && PRIORITY[tags[i]] >= PRIORITY[type]) { blocked = true; break }
      }
      if (!blocked) {
        for (let i = idx; i < end; i++) tags[i] = type
      }
      idx++
    }
  }

  // Collapse consecutive same-tag characters into segments
  const segs = []
  let i = 0
  while (i < len) {
    const t = tags[i]
    let j = i + 1
    while (j < len && tags[j] === t) j++
    segs.push({ text: text.slice(i, j), type: t })
    i = j
  }
  return segs
}

/**
 * Check whether a trimmed line appears in the quantified_lines list.
 * Uses a 40-char prefix match to handle minor whitespace differences.
 */
function isQuantified(line, quantifiedLines) {
  if (!quantifiedLines?.length) return false
  const prefix = line.trim().slice(0, 40).toLowerCase()
  if (prefix.length < 15) return false
  return quantifiedLines.some(ql => ql.toLowerCase().slice(0, 40).startsWith(prefix.slice(0, 25)))
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders one annotated segment span */
function Seg({ text, type }) {
  if (!type) return <>{text}</>
  return <span className={`atv-seg atv-seg--${type}`}>{text}</span>
}

/** Renders one full text line with optional quantified-line highlight */
function AnnotatedLine({ line, annotations, quantifiedLines }) {
  const segs      = useMemo(() => annotateText(line, annotations), [line, annotations])
  const quantified = useMemo(() => isQuantified(line, quantifiedLines), [line, quantifiedLines])

  if (!line.trim()) return <div className="atv-blank-line" />

  return (
    <div className={`atv-line${quantified ? ' atv-line--quantified' : ''}`}>
      {quantified && <span className="atv-quant-badge" title="Quantified achievement">✅</span>}
      {segs.map((s, i) => <Seg key={i} text={s.text} type={s.type} />)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ResumeTextViewer — annotated plain-text view of what the ATS extracted.
 *
 * Highlights:
 *   🟢 Matched keywords     — green background
 *   🔴 Missing keywords     — red underline (JD tab only)
 *   🟠 Weak verbs           — orange underline
 *   🔵 Strong verbs         — blue underline
 *   ✅ Quantified lines     — left border + badge
 *
 * Props:
 *   report    {object}   Full scoring report
 *   collapsed {boolean}  Whether the panel is collapsed (controlled by parent)
 *   onToggle  {fn}       Called when the user clicks the hide/show button
 */
export default function ResumeTextViewer({ report, collapsed, onToggle }) {
  const [activeTab, setActiveTab] = useState('resume')

  const {
    resume_text      = '',
    jd_text          = '',
    matched_keywords = [],
    missing_keywords = [],
    weak_verbs_found = [],
    strong_verbs_found = [],
    quantified_lines = [],
    mode,
  } = report

  const isJdMode = mode === 'ats_vs_jd' && jd_text

  const resumeAnnotations = useMemo(() => ({
    matched: matched_keywords,
    weak:    weak_verbs_found,
    strong:  strong_verbs_found,
  }), [matched_keywords, weak_verbs_found, strong_verbs_found])

  const jdAnnotations = useMemo(() => ({
    matched: matched_keywords,
    missing: missing_keywords,
  }), [matched_keywords, missing_keywords])

  const activeText        = activeTab === 'resume' ? resume_text : jd_text
  const activeAnnotations = activeTab === 'resume' ? resumeAnnotations : jdAnnotations
  const lines             = activeText.split('\n')

  // Collapsed state: render a slim vertical "expand" strip — takes no grid space
  if (collapsed) {
    return (
      <button className="atv-expand-btn" onClick={onToggle} type="button" aria-label="Show ATS text view">
        <span className="atv-expand-icon">📄</span>
        <span className="atv-expand-label">ATS Text</span>
        <span className="atv-expand-arrow">▶</span>
      </button>
    )
  }

  return (
    <div className="atv-wrapper">

      {/* ── Header bar ── */}
      <div className="atv-header">
        <div className="atv-header-left">
          {/* Always-visible section label */}
          <span className="atv-section-label">ATS Extracted Text</span>

          {/* Tabs — only in two-file mode */}
          {isJdMode && (
            <div className="atv-tabs">
              <button
                className={`atv-tab${activeTab === 'resume' ? ' atv-tab--active' : ''}`}
                onClick={() => setActiveTab('resume')}
                type="button"
              >
                📄 Resume
              </button>
              <button
                className={`atv-tab${activeTab === 'jd' ? ' atv-tab--active' : ''}`}
                onClick={() => setActiveTab('jd')}
                type="button"
              >
                📋 Job Description
              </button>
            </div>
          )}
        </div>

        <button
          className="atv-collapse-btn"
          onClick={onToggle}
          type="button"
          aria-label="Collapse text view"
        >
          ◀ Hide
        </button>
      </div>

      {/* ── Legend ── */}
      <div className="atv-legend">
        <span className="atv-legend-item atv-legend--matched">matched</span>
        {activeTab === 'jd'
          ? <span className="atv-legend-item atv-legend--missing">missing in resume</span>
          : <>
              <span className="atv-legend-item atv-legend--weak">weak verb</span>
              <span className="atv-legend-item atv-legend--strong">strong verb</span>
              <span className="atv-legend-item atv-legend--quantified">quantified ✅</span>
            </>
        }
      </div>

      {/* ── Annotated text ── */}
      <div className="atv-content">
        {activeText
          ? lines.map((line, i) => (
              <AnnotatedLine
                key={i}
                line={line}
                annotations={activeAnnotations}
                quantifiedLines={activeTab === 'resume' ? quantified_lines : []}
              />
            ))
          : <p className="atv-empty">
              No text available.
              {!report.resume_text && report.overall_score != null &&
                ' Restart the backend to enable the annotated text view.'}
            </p>
        }
      </div>
    </div>
  )
}
