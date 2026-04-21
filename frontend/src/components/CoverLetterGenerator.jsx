import { useState } from 'react'
import './CoverLetterGenerator.css'

/**
 * CoverLetterGenerator
 * Shown below the ReportCard after a successful analysis.
 * Sends already-extracted resume_text + jd_text (from the report) to
 * POST /generate-cover-letter and displays the resulting draft in an
 * editable textarea with Copy + Download actions.
 *
 * Props:
 *   report  {object}  The full result object from /analyze (must include resume_text)
 *   apiUrl  {string}  Backend base URL (VITE_API_URL)
 */
export default function CoverLetterGenerator({ report, apiUrl }) {
  const [open, setOpen] = useState(false)
  const [roleName, setRoleName] = useState(report?.detected_jd_title || '')
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const resumeText = report?.resume_text || ''
  const jdText = report?.jd_text || ''
  const isJDMode = report?.mode === 'ats_vs_jd' && jdText

  // ---- generate ----
  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    setResult(null)

    const body = new FormData()
    body.append('resume_text', resumeText)
    body.append('jd_text', jdText)
    body.append('company_name', companyName)
    body.append('role_name', roleName)

    try {
      const res = await fetch(`${apiUrl}/generate-cover-letter`, {
        method: 'POST',
        body,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ---- copy ----
  function handleCopy() {
    if (!result?.cover_letter) return
    navigator.clipboard.writeText(result.cover_letter).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ---- download .txt ----
  function handleDownload() {
    if (!result?.cover_letter) return
    const slug = (companyName || result.detected_role || 'draft')
      .replace(/\s+/g, '-')
      .toLowerCase()
    const blob = new Blob([result.cover_letter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cover-letter-${slug}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="clg-wrapper">
      {/* Toggle header */}
      <button
        className="clg-toggle"
        onClick={() => setOpen((o) => !o)}
        type="button"
        aria-expanded={open}
      >
        <span className="clg-toggle-icon">✉️</span>
        <span className="clg-toggle-text">
          {open ? 'Hide Cover Letter Generator' : 'Generate Tailored Cover Letter Draft'}
        </span>
        <span className="clg-toggle-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="clg-body">
          <p className="clg-desc">
            Get a personalised cover letter built from your actual resume
            {isJDMode ? ' and the job description' : ''}.
            No AI — filled from your skills, experience, and achievements.
          </p>

          {/* Inputs */}
          <div className="clg-inputs">
            <div className="clg-field">
              <label className="clg-label" htmlFor="clg-role">
                Role / Position
              </label>
              <input
                id="clg-role"
                className="clg-input"
                type="text"
                placeholder={report?.detected_jd_title || 'e.g. Senior Software Engineer'}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            <div className="clg-field">
              <label className="clg-label" htmlFor="clg-company">
                Company Name
              </label>
              <input
                id="clg-company"
                className="clg-input"
                type="text"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <button
            className="clg-generate-btn"
            onClick={handleGenerate}
            disabled={isLoading || !resumeText}
            type="button"
          >
            {isLoading ? '⏳ Generating…' : '✨ Generate Draft'}
          </button>

          {/* Error */}
          {error && <p className="clg-error">⚠️ {error}</p>}

          {/* Result */}
          {result && (
            <div className="clg-result">
              {/* Skills used */}
              {result.matched_skills_used?.length > 0 && (
                <div className="clg-skills-row">
                  <span className="clg-skills-label">Skills woven in:</span>
                  {result.matched_skills_used.map((s) => (
                    <span key={s} className="clg-skill-pill">{s}</span>
                  ))}
                </div>
              )}

              {/* Editable letter */}
              <textarea
                className="clg-textarea"
                value={result.cover_letter}
                onChange={(e) => setResult({ ...result, cover_letter: e.target.value })}
                rows={22}
                spellCheck
                aria-label="Generated cover letter"
              />

              {/* Action buttons */}
              <div className="clg-actions">
                <button
                  className="clg-action-btn clg-copy-btn"
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? '✅ Copied!' : '⎘ Copy'}
                </button>
                <button
                  className="clg-action-btn clg-download-btn"
                  onClick={handleDownload}
                  type="button"
                >
                  📄 Download .txt
                </button>
              </div>

              <p className="clg-disclaimer">
                ⚠️ Review and personalise before sending — this is a starting draft, not a final letter.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
