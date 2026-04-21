import { useState, useRef } from 'react'
import ScoreRing from './ScoreRing.jsx'
import ProgressBar from './ProgressBar.jsx'
import './CompareMode.css'

const MAX_JDS = 5

/**
 * CompareMode — lets users upload one resume against up to 5 JDs
 * and see scores side by side.
 *
 * Props:
 *   apiUrl      {string}    Base URL for the backend API
 *   onBack      {Function}  Called when user wants to go back to single mode
 */
export default function CompareMode({ apiUrl, onBack }) {
  const [resumeFile, setResumeFile] = useState(null)
  const [jdFiles, setJdFiles] = useState(() => Array(MAX_JDS).fill(null))
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const resumeRef = useRef(null)
  // Stable ref array sized to MAX_JDS — created once on mount.
  const jdRefsHolder = useRef(null)
  if (jdRefsHolder.current === null) {
    jdRefsHolder.current = Array.from({ length: MAX_JDS }, () => ({ current: null }))
  }
  const jdRefs = jdRefsHolder.current

  function isValid(f) {
    if (!f) return false
    return (
      f.type === 'application/pdf' ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      f.name.toLowerCase().endsWith('.docx')
    )
  }

  function setJd(idx, file) {
    setJdFiles((prev) => {
      const next = [...prev]
      next[idx] = file
      return next
    })
  }

  const filledJds = jdFiles.filter(Boolean)
  const canCompare = !!resumeFile && filledJds.length >= 1 && !isLoading

  async function handleCompare() {
    setIsLoading(true)
    setError(null)
    setResults(null)

    const form = new FormData()
    form.append('resume', resumeFile)
    for (const f of filledJds) form.append('jds', f)

    try {
      const res = await fetch(`${apiUrl}/compare`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      setResults(await res.json())
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  function reset() {
    setResumeFile(null)
    setJdFiles(Array(MAX_JDS).fill(null))
    setResults(null)
    setError(null)
  }

  // Determine best match (highest overall_score)
  const bestIdx = results
    ? results.reduce((bi, r, i) => (r.overall_score > results[bi].overall_score ? i : bi), 0)
    : -1

  return (
    <div className="compare-mode">
      {/* Header */}
      <div className="compare-header card">
        <div className="compare-header-left">
          <h2 className="compare-title">Multi-JD Comparison</h2>
          <p className="compare-subtitle">
            Upload your resume once and compare it against up to {MAX_JDS} job descriptions simultaneously.
          </p>
        </div>
        <button className="compare-back-btn" onClick={onBack} type="button">
          ← Single Mode
        </button>
      </div>

      {/* Upload area */}
      {!results && (
        <div className="compare-upload card">
          {/* Resume */}
          <div className="compare-upload-row">
            <label className="compare-upload-label">Resume (PDF / DOCX)</label>
            <div
              className={`compare-drop ${resumeFile ? 'compare-drop--has' : ''}`}
              onClick={() => resumeRef.current?.click()}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && resumeRef.current?.click()}
            >
              <input
                ref={resumeRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (isValid(f)) setResumeFile(f) }}
              />
              {resumeFile ? <><span>✅</span> <span className="compare-fname">{resumeFile.name}</span></> : <span>📄 Click to upload resume</span>}
            </div>
          </div>

          {/* JD slots */}
          <div className="compare-jd-grid">
            {Array.from({ length: MAX_JDS }, (_, idx) => idx).map((idx) => (
              <div key={idx} className="compare-upload-row">
                <label className="compare-upload-label">
                  Job Description {idx + 1}{idx === 0 ? ' *' : ' (optional)'}
                </label>
                <div
                  className={`compare-drop ${jdFiles[idx] ? 'compare-drop--has' : ''}`}
                  onClick={() => jdRefs[idx].current?.click()}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && jdRefs[idx].current?.click()}
                >
                  <input
                    ref={jdRefs[idx]}
                    type="file"
                    accept=".pdf,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (isValid(f)) setJd(idx, f) }}
                  />
                  {jdFiles[idx]
                    ? <><span>✅</span> <span className="compare-fname">{jdFiles[idx].name}</span></>
                    : <span>📋 Click to upload JD {idx + 1}</span>}
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn-primary compare-submit-btn"
            onClick={handleCompare}
            disabled={!canCompare}
          >
            {isLoading
              ? <><span className="spinner" /> Comparing…</>
              : `Compare Against ${filledJds.length} JD${filledJds.length !== 1 ? 's' : ''} →`}
          </button>

          {error && <div className="error-message">⚠️ {error}</div>}
        </div>
      )}

      {/* Results grid */}
      {results && (
        <div className="compare-results">
          {/* Best match callout */}
          {results.length > 1 && (
            <div className="compare-best-callout">
              🏆 Best match: <strong>{results[bestIdx].jd_label}</strong> with a score of{' '}
              <strong>{results[bestIdx].overall_score}/100</strong>
            </div>
          )}

          <div className="compare-cards-grid" style={{ '--col-count': results.length }}>
            {results.map((r, i) => (
              <div key={i} className={`compare-card card${i === bestIdx && results.length > 1 ? ' compare-card--best' : ''}`}>
                {i === bestIdx && results.length > 1 && (
                  <div className="best-badge">Best Match</div>
                )}
                <div className="compare-card-jd-name" title={r.jd_label}>{r.jd_label}</div>
                <ScoreRing score={r.overall_score} compact />
                <div className="compare-bars">
                  <ProgressBar label="Keywords"   score={r.keyword_match_score} color="var(--accent)" compact />
                  <ProgressBar label="Skills"     score={r.skills_score}        color="var(--accent-light)" compact />
                  <ProgressBar label="Experience" score={r.experience_score}    color="var(--success)" compact />
                  <ProgressBar label="Education"  score={r.education_score}     color="var(--warning)" compact />
                </div>
                {r.missing_keywords?.length > 0 && (
                  <div className="compare-missing">
                    <span className="compare-missing-label">Top missing keywords:</span>
                    <div className="compare-missing-pills">
                      {r.missing_keywords.slice(0, 5).map((kw) => (
                        <span key={kw} className="compare-pill">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="btn-primary compare-reset-btn" onClick={reset} type="button">
            ↺ New Comparison
          </button>
        </div>
      )}
    </div>
  )
}
