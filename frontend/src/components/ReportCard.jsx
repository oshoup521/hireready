import ScoreRing from './ScoreRing.jsx'
import ProgressBar from './ProgressBar.jsx'
import KeywordBadges from './KeywordBadges.jsx'
import DownloadButton from './DownloadButton.jsx'
import './ReportCard.css'

/**
 * ReportCard — Full scoring report rendered after a successful analysis.
 * Props:
 *   report {object} The full result object from the /analyze endpoint.
 *
 * Supports two modes:
 *   mode === 'ats_vs_jd'    — shows keyword match score + JD comparison panels
 *   mode === 'resume_only'  — shows sections score + resume keywords only panel
 */
export default function ReportCard({ report }) {
  const {
    mode,
    overall_score,
    keyword_match_score,
    skills_score,
    experience_score,
    education_score,
    sections_score,
    matched_keywords,
    missing_keywords,
    extra_keywords,
    sections_found,
    sections_missing,
    suggestions,
    resume_word_count,
    jd_word_count,
  } = report

  const isResumeOnly = mode === 'resume_only'

  return (
    <div id="report-card">

      {/* Mode badge */}
      <div className="mode-badge-row">
        <span className={`mode-badge ${isResumeOnly ? 'mode-badge--ats' : 'mode-badge--jd'}`}>
          {isResumeOnly ? '✅ ATS Check Only' : '📋 ATS vs Job Description'}
        </span>
      </div>

      {/* 1 — Overall Score Ring */}
      <div className="card score-ring-card">
        <ScoreRing score={overall_score} />

        {/* Word count metadata */}
        <div className="word-counts">
          <span>Resume: {resume_word_count.toLocaleString()} words</span>
          {!isResumeOnly && jd_word_count > 0 && (
            <>
              <span className="wc-sep">·</span>
              <span>Job Description: {jd_word_count.toLocaleString()} words</span>
            </>
          )}
        </div>
      </div>

      {/* 2 — Sub-score progress bars */}
      <div className="card">
        <h3 className="section-title">Score Breakdown</h3>

        {/* Keyword Match only shown in JD-comparison mode */}
        {!isResumeOnly && (
          <ProgressBar label="Keyword Match"   score={keyword_match_score}  color="var(--accent)" />
        )}

        <ProgressBar label="Skills"          score={skills_score}         color="var(--accent-light)" />
        <ProgressBar label="Experience"      score={experience_score}     color="var(--success)" />
        <ProgressBar label="Education"       score={education_score}      color="var(--warning)" />

        {/* Sections structure only shown in ATS-only mode */}
        {isResumeOnly && sections_score != null && (
          <ProgressBar label="Sections Structure" score={sections_score}  color="var(--accent)" />
        )}
      </div>

      {/* 3 — Keyword analysis */}
      <div className="card">
        <h3 className="section-title">
          {isResumeOnly ? 'Your Resume Keywords' : 'Keyword Analysis'}
        </h3>

        {isResumeOnly ? (
          /* ATS-only: show only the resume's own extracted keywords */
          <KeywordBadges
            resumeOnlyKeywords={extra_keywords}
          />
        ) : (
          /* JD-comparison: show matched / missing / extra */
          <KeywordBadges
            matched={matched_keywords}
            missing={missing_keywords}
            extra={extra_keywords}
          />
        )}
      </div>

      {/* 4 — Sections found / missing */}
      <div className="card">
        <h3 className="section-title">Resume Sections</h3>
        <div className="sections-grid">
          <div className="sections-col">
            <div className="sections-col-title found-title">Found</div>
            {sections_found.length === 0 ? (
              <span className="sections-none">None detected</span>
            ) : (
              sections_found.map((s) => (
                <div key={s} className="section-item section-found">
                  <span className="section-icon">✅</span> {s}
                </div>
              ))
            )}
          </div>

          <div className="sections-col">
            <div className="sections-col-title missing-title">Missing</div>
            {sections_missing.length === 0 ? (
              <span className="sections-none">All sections present!</span>
            ) : (
              sections_missing.map((s) => (
                <div key={s} className="section-item section-missing">
                  <span className="section-icon">❌</span> {s}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5 — Suggestions */}
      <div className="card">
        <h3 className="section-title">Improvement Suggestions</h3>
        <ul className="suggestions-list">
          {suggestions.map((tip, idx) => (
            <li key={idx} className="suggestion-item">
              <span className="suggestion-bullet">💡</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 6 — Download button */}
      <DownloadButton />

    </div>
  )
}
