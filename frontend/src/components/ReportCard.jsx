import { useState } from 'react'
import ScoreRing from './ScoreRing.jsx'
import ProgressBar from './ProgressBar.jsx'
import KeywordBadges from './KeywordBadges.jsx'
import DownloadButton from './DownloadButton.jsx'
import DetailPanel from './DetailPanel.jsx'
import './ReportCard.css'

/* Small hook: returns a copy-to-clipboard function + a transient "Copied!" state */
function useCopy() {
  const [copiedIdx, setCopiedIdx] = useState(null)
  function copy(text, idx) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1800)
    })
  }
  return { copiedIdx, copy }
}

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
  const { copiedIdx, copy } = useCopy()
  const {
    mode,
    overall_score,
    keyword_match_score,
    skills_score,
    experience_score,
    education_score,
    sections_score,
    formatting_score,
    formatting_issues,
    grammar_score,
    grammar_issues,
    action_verb_score,
    strong_verbs_found,
    weak_verbs_found,
    quantification_score,
    quantified_lines,
    detected_jd_title,
    job_title_match,
    title_relevance_score,
    rewrite_suggestions,
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

      {/* 3 — Extended score breakdown (new metrics) */}
      <div className="card">
        <h3 className="section-title">Quality Metrics</h3>

        {/* ATS Formatting */}
        {formatting_score != null && (
          <ProgressBar label="ATS Formatting" score={formatting_score} color="var(--accent)" />
        )}
        {formatting_issues?.length > 0 && (
          <DetailPanel title={`${formatting_issues.length} formatting issue(s)`} color="var(--warning)">
            {formatting_issues.map((issue, i) => (
              <div key={i} className="detail-issue">⚠️ {issue}</div>
            ))}
          </DetailPanel>
        )}

        {/* Grammar & Spelling */}
        {grammar_score != null && (
          <ProgressBar label="Grammar & Spelling" score={grammar_score} color="var(--accent-light)" />
        )}
        {grammar_issues?.length > 0 && (
          <DetailPanel title={`${grammar_issues.length} grammar issue(s)`} color="var(--warning)">
            {grammar_issues.map((issue, i) => (
              <div key={i} className="detail-issue">⚠️ {issue}</div>
            ))}
          </DetailPanel>
        )}

        {/* Action Verbs */}
        {action_verb_score != null && (
          <ProgressBar label="Action Verbs" score={action_verb_score} color="var(--success)" />
        )}
        {(strong_verbs_found?.length > 0 || weak_verbs_found?.length > 0) && (
          <DetailPanel title="Verb analysis" color="var(--text-secondary)">
            {strong_verbs_found?.length > 0 && (
              <div className="verb-row">
                <span className="verb-label verb-label--strong">Strong:</span>
                {strong_verbs_found.map((v) => (
                  <span key={v} className="verb-badge verb-badge--strong">{v}</span>
                ))}
              </div>
            )}
            {weak_verbs_found?.length > 0 && (
              <div className="verb-row">
                <span className="verb-label verb-label--weak">Weak:</span>
                {weak_verbs_found.map((v) => (
                  <span key={v} className="verb-badge verb-badge--weak">{v}</span>
                ))}
              </div>
            )}
          </DetailPanel>
        )}

        {/* Quantification */}
        {quantification_score != null && (
          <ProgressBar label="Quantified Achievements" score={quantification_score} color="var(--warning)" />
        )}
        {quantified_lines?.length > 0 && (
          <DetailPanel title={`${quantified_lines.length} quantified line(s) found`} color="var(--success)">
            {quantified_lines.map((line, i) => (
              <div key={i} className="detail-quote">✅ {line}</div>
            ))}
          </DetailPanel>
        )}

        {/* Job Title Relevance (JD mode only) */}
        {!isResumeOnly && title_relevance_score != null && (
          <>
            <ProgressBar label="Job Title Relevance" score={title_relevance_score} color={job_title_match ? 'var(--success)' : 'var(--danger)'} />
            {detected_jd_title && (
              <p className="title-hint">
                Detected JD role: <strong>{detected_jd_title}</strong>
                {job_title_match
                  ? ' — mentioned in your resume ✅'
                  : ' — not clearly mentioned in your resume ❌'}
              </p>
            )}
          </>
        )}
      </div>

      {/* 4 (was 3) — Keyword analysis */}
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

      {/* 5 — Sections found / missing */}
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

      {/* 6 — Suggestions */}
      <div className="card">
        <h3 className="section-title">Improvement Suggestions</h3>
        <ul className="suggestions-list">
          {suggestions.map((tip, idx) => (
            <li key={idx} className="suggestion-item">
              <span className="suggestion-bullet">💡</span>
              <span className="suggestion-text">{tip}</span>
              <button
                className={`copy-btn ${copiedIdx === idx ? 'copy-btn--copied' : ''}`}
                onClick={() => copy(tip, idx)}
                title="Copy suggestion"
                aria-label="Copy suggestion"
                type="button"
              >
                {copiedIdx === idx ? '✓' : '⎘'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 7 — Rewrite suggestions */}
      {rewrite_suggestions?.length > 0 && (
        <div className="card">
          <h3 className="section-title">Suggested Rewrites</h3>
          <p className="rewrites-intro">
            These bullet points use weak phrasing. Here's how to make them stronger:
          </p>
          <div className="rewrites-list">
            {rewrite_suggestions.map((item, idx) => (
              <div key={idx} className="rewrite-item">
                <div className="rewrite-row rewrite-row--before">
                  <span className="rewrite-label rewrite-label--before">Before</span>
                  <span className="rewrite-text">{item.original}</span>
                </div>
                <div className="rewrite-row rewrite-row--after">
                  <span className="rewrite-label rewrite-label--after">After</span>
                  <span className="rewrite-text">{item.rewritten}</span>
                  <button
                    className={`copy-btn ${copiedIdx === `rw-${idx}` ? 'copy-btn--copied' : ''}`}
                    onClick={() => copy(item.rewritten, `rw-${idx}`)}
                    title="Copy rewritten version"
                    type="button"
                  >
                    {copiedIdx === `rw-${idx}` ? '✓' : '⎘'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8 — Download button */}
      <DownloadButton />

    </div>
  )
}
