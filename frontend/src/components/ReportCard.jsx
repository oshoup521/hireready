import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import ScoreRing from './ScoreRing.jsx'
import ProgressBar from './ProgressBar.jsx'
import KeywordBadges from './KeywordBadges.jsx'
import DownloadButton from './DownloadButton.jsx'
import DetailPanel from './DetailPanel.jsx'
import ScoreShareCard from './ScoreShareCard.jsx'
import ScoreDiff from './ScoreDiff.jsx'
import './ReportCard.css'

// ---------------------------------------------------------------------------
// Confetti — pure-CSS particle burst fired when score ≥ 75
// ---------------------------------------------------------------------------
function Confetti() {
  const COLORS = ['#6c63ff', '#4caf7d', '#f0a500', '#e05c5c', '#8b85ff', '#ffffff', '#ff6b9d', '#00d4ff']
  // 90 pieces with staggered delays spread across 2s so they rain continuously
  const PIECES = Array.from({ length: 90 }, (_, i) => {
    const isRect = Math.random() > 0.5   // mix squares and thin rectangles
    return {
      id: i,
      color: COLORS[i % COLORS.length],
      left: `${Math.random() * 100}%`,
      // Each piece takes 3.5 – 6s to fall the full screen height
      animDuration: `${3.5 + Math.random() * 2.5}s`,
      // Spread launch times across 2.5s so new pieces keep appearing
      animDelay: `${Math.random() * 2.5}s`,
      width:  isRect ? `${3 + Math.random() * 5}px` : `${5 + Math.random() * 6}px`,
      height: isRect ? `${8 + Math.random() * 10}px` : `${5 + Math.random() * 6}px`,
      borderRadius: isRect ? '1px' : '50%',
      // Sideways drift distance — positive = right, negative = left
      drift: `${(Math.random() - 0.5) * 200}px`,
      rotate: `${Math.random() * 360}deg`,
    }
  })

  // Portal to document.body so position:fixed is relative to the true viewport,
  // not trapped inside the ancestor's transform/animation stacking context.
  return createPortal(
    <div className="confetti-wrapper" aria-hidden="true">
      {PIECES.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            background: p.color,
            borderRadius: p.borderRadius,
            animationDuration: p.animDuration,
            animationDelay: p.animDelay,
            '--rotate': p.rotate,
            '--drift': p.drift,
          }}
        />
      ))}
    </div>,
    document.body
  )
}

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
// Sections that, if missing, are genuinely critical vs merely recommended
const CRITICAL_SECTIONS    = new Set(['Summary', 'Experience', 'Education', 'Skills'])
const RECOMMENDED_SECTIONS = new Set(['Projects', 'Certifications'])

function SectionsHeatmap({ found, missing }) {
  // Merge all sections into one flat list preserving a stable display order
  const all = [
    ...found.map(s => ({ name: s, state: 'found' })),
    ...missing.map(s => ({
      name: s,
      state: CRITICAL_SECTIONS.has(s) ? 'critical' : RECOMMENDED_SECTIONS.has(s) ? 'recommended' : 'optional',
    })),
  ]

  // Stable sort: found first, then critical missing, then recommended, then optional
  const ORDER = { found: 0, critical: 1, recommended: 2, optional: 3 }
  all.sort((a, b) => ORDER[a.state] - ORDER[b.state])

  const legend = [
    { state: 'found',       label: 'Present',     color: 'var(--success)' },
    { state: 'critical',    label: 'Missing (critical)', color: 'var(--danger)' },
    { state: 'recommended', label: 'Missing (recommended)', color: 'var(--warning)' },
    { state: 'optional',    label: 'Missing (optional)', color: 'var(--text-secondary)' },
  ]

  return (
    <div className="card">
      <h3 className="section-title">Resume Sections</h3>
      <div className="heatmap-grid">
        {all.map(({ name, state }) => (
          <div key={name} className={`heatmap-pill heatmap-pill--${state}`}>
            <span className="heatmap-dot" />
            {name}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        {legend.map(({ state, label, color }) => {
          const count = all.filter(s => s.state === state).length
          if (count === 0) return null
          return (
            <span key={state} className="heatmap-legend-item" style={{ color }}>
              <span className="heatmap-legend-dot" style={{ background: color }} />
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function ReportCard({ report, previousEntry }) {
  const { copiedIdx, copy } = useCopy()
  const [showShareCard, setShowShareCard] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Fire confetti once when a high score is loaded
  useEffect(() => {
    if (report?.overall_score >= 75) {
      setShowConfetti(true)
      // Keep confetti alive until the last piece (2.5s delay + 6s fall = 8.5s)
      const t = setTimeout(() => setShowConfetti(false), 9000)
      return () => clearTimeout(t)
    }
  }, [report?.overall_score])

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
    readability_score,
    buzzwords_found,
    cover_letter_score,
    cover_letter_matched,
    cover_letter_missing,
    required_years,
    candidate_years,
    years_match,
    experience_gap_years,
    years_fit_score,
    jd_seniority,
    resume_seniority,
    implied_seniority,
    seniority_mismatch,
    seniority_warning,
    positions_found,
    employment_gaps,
    matched_keywords,
    missing_keywords,
    extra_keywords,
    sections_found,
    sections_missing,
    section_order,
    section_order_suggestions,
    bullet_density_issues,
    suggestions,
    resume_word_count,
    jd_word_count,
    score_explanations,
    detected_company,
  } = report

  const isResumeOnly = mode === 'resume_only'

  return (
    <div id="report-card">
      {/* Confetti burst for high scores */}
      {showConfetti && <Confetti />}

      {/* Share card overlay */}
      {showShareCard && (
        <ScoreShareCard report={report} onClose={() => setShowShareCard(false)} />
      )}

      {/* Diff banner — shown when there's a previous run to compare against */}
      {previousEntry && (
        <ScoreDiff
          current={report}
          previous={previousEntry.report}
          previousLabel={`${previousEntry.resumeFileName} · ${new Date(previousEntry.timestamp).toLocaleString()}`}
        />
      )}

      {/* Mode badge + JD role/company banner */}
      <div className="mode-badge-row">
        <span className={`mode-badge ${isResumeOnly ? 'mode-badge--ats' : 'mode-badge--jd'}`}>
          {isResumeOnly ? '✅ ATS Check Only' : '📋 ATS vs Job Description'}
        </span>
        {!isResumeOnly && (detected_jd_title || detected_company) && (
          <span className="analyzing-for-badge">
            Analyzing for:{' '}
            <strong>
              {[detected_jd_title, detected_company].filter(Boolean).join(' @ ')}
            </strong>
          </span>
        )}
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

        {/* Share card button */}
        <button
          className="share-score-btn"
          onClick={() => setShowShareCard(true)}
          type="button"
          title="Generate a shareable score card"
        >
          🎴 Share Score Card
        </button>
      </div>

      {/* 2 — Sub-score progress bars */}
      <div className="card">
        <h3 className="section-title">Score Breakdown</h3>

        {/* Keyword Match only shown in JD-comparison mode */}
        {!isResumeOnly && (
          <ProgressBar label="Keyword Match"   score={keyword_match_score}  color="var(--accent)"       hint={score_explanations?.keyword_match} />
        )}

        <ProgressBar label="Skills"          score={skills_score}         color="var(--accent-light)" hint={score_explanations?.skills} />
        <ProgressBar label="Experience"      score={experience_score}     color="var(--success)"      hint={score_explanations?.experience} />
        <ProgressBar label="Education"       score={education_score}      color="var(--warning)"      hint={score_explanations?.education} />

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

        {/* Bullet Density Issues */}
        {bullet_density_issues?.length > 0 && (
          <DetailPanel title={`${bullet_density_issues.length} bullet-density issue(s)`} color="var(--warning)">
            {bullet_density_issues.map((issue, i) => (
              <div key={i} className="detail-issue">📄 {issue}</div>
            ))}
          </DetailPanel>
        )}
      </div>

      {/* 3b — Experience Fit: years-of-experience, seniority, employment gaps.
          Only shown when at least one field has meaningful data. */}
      {(candidate_years > 0 || required_years != null || jd_seniority || (employment_gaps?.length > 0)) && (
        <div className="card">
          <h3 className="section-title">Experience Fit</h3>

          {/* JD mode — years-of-experience requirement vs candidate */}
          {!isResumeOnly && required_years != null && (
            <>
              <ProgressBar
                label={`Years-of-Experience Fit (${required_years}+ yrs required)`}
                score={years_fit_score ?? 0}
                color={years_match ? 'var(--success)' : 'var(--danger)'}
              />
              <p className={`exp-hint ${years_match ? 'exp-hint--ok' : 'exp-hint--miss'}`}>
                {years_match
                  ? `✅ You show ${candidate_years.toFixed(1)} years — meets the ${required_years}+ requirement.`
                  : `❌ JD requires ${required_years}+ years; your resume shows ${candidate_years.toFixed(1)} (${experience_gap_years} yr gap).`}
              </p>
            </>
          )}

          {/* ATS-only mode — just show candidate years + implied seniority */}
          {isResumeOnly && candidate_years > 0 && (
            <p className="exp-hint exp-hint--ok">
              📅 <strong>{candidate_years.toFixed(1)} years</strong> of experience detected
              {positions_found > 0 && ` across ${positions_found} position${positions_found === 1 ? '' : 's'}`}
              {implied_seniority && ` — reads as ${implied_seniority}-level.`}
            </p>
          )}

          {/* Seniority panel */}
          {(jd_seniority || resume_seniority || implied_seniority) && (
            <div className="seniority-row">
              {jd_seniority && (
                <div className="seniority-chip seniority-chip--jd">
                  <span className="seniority-chip-label">JD target</span>
                  <span className="seniority-chip-value">{jd_seniority}</span>
                </div>
              )}
              <div className={`seniority-chip ${seniority_mismatch ? 'seniority-chip--bad' : 'seniority-chip--ok'}`}>
                <span className="seniority-chip-label">Your level</span>
                <span className="seniority-chip-value">
                  {resume_seniority || implied_seniority || '—'}
                </span>
              </div>
            </div>
          )}

          {/* Seniority warning */}
          {seniority_warning && (
            <div className={`seniority-warning ${seniority_mismatch ? 'seniority-warning--hard' : 'seniority-warning--soft'}`}>
              <span className="seniority-warning-icon">{seniority_mismatch ? '🚩' : '⚠️'}</span>
              <span>{seniority_warning}</span>
            </div>
          )}

          {/* Employment gaps */}
          {employment_gaps?.length > 0 && (
            <DetailPanel title={`${employment_gaps.length} employment gap${employment_gaps.length === 1 ? '' : 's'} detected`} color="var(--warning)">
              {employment_gaps.map((g, i) => (
                <div key={i} className="gap-item">
                  <span className="gap-icon">📅</span>
                  <span>
                    <strong>{g.gap_months} months</strong> between{' '}
                    <strong>{g.after}</strong> and <strong>{g.before}</strong>.
                  </span>
                </div>
              ))}
            </DetailPanel>
          )}
        </div>
      )}

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

      {/* 5 — Sections heatmap */}
      <SectionsHeatmap found={sections_found} missing={sections_missing} />

      {/* 5b — Section Order Recommendations */}
      {section_order_suggestions?.length > 0 && (
        <div className="card">
          <h3 className="section-title">Section Order Recommendations</h3>
          {section_order?.length > 0 && (
            <div className="section-order-row">
              <span className="section-order-label">Current order:</span>
              {section_order.map((s, i) => (
                <span key={s} className="section-order-chip">
                  {i + 1}. {s}
                </span>
              ))}
            </div>
          )}
          <ul className="section-order-tips">
            {section_order_suggestions.map((tip, i) => (
              <li key={i} className="section-order-tip">
                <span className="section-order-tip-icon">🔀</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {/* 8 — Readability & Buzzwords */}
      {(readability_score != null || buzzwords_found?.length > 0) && (
        <div className="card">
          <h3 className="section-title">Resume Insights</h3>

          {/* Readability (Flesch Reading Ease) */}
          {readability_score != null && (
            <>
              <ProgressBar
                label="Readability (Flesch Reading Ease)"
                score={readability_score}
                color={readability_score >= 60 ? 'var(--success)' : readability_score >= 40 ? 'var(--warning)' : 'var(--danger)'}
              />
              <p className="readability-hint">
                {readability_score >= 70
                  ? '✅ Very easy to read — great for broad audiences.'
                  : readability_score >= 60
                  ? '✅ Standard / plain English — good readability.'
                  : readability_score >= 40
                  ? '⚠️ Somewhat complex — consider simplifying long sentences.'
                  : '❌ Difficult to read — shorten sentences and use simpler vocabulary.'}
              </p>
            </>
          )}

          {/* Buzzword detector */}
          {buzzwords_found?.length > 0 && (
            <div className="buzzword-section">
              <div className="buzzword-header">
                <span className="buzzword-icon">🚩</span>
                <span className="buzzword-title">Buzzwords Detected ({buzzwords_found.length})</span>
              </div>
              <p className="buzzword-desc">
                These overused phrases can hurt your credibility — replace them with concrete examples and metrics.
              </p>
              <div className="buzzword-list">
                {buzzwords_found.map((bw) => (
                  <span key={bw} className="buzzword-badge">{bw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9 — Cover Letter Analysis */}
      {cover_letter_score != null && (
        <div className="card">
          <h3 className="section-title">Cover Letter Analysis</h3>
          <ProgressBar
            label="Cover Letter JD Match"
            score={cover_letter_score}
            color="var(--accent)"
          />
          {cover_letter_matched?.length > 0 && (
            <p className="cl-hint cl-hint--matched">
              ✅ Matched {cover_letter_matched.length} JD keywords in cover letter.
            </p>
          )}
          {cover_letter_missing?.length > 0 && (
            <p className="cl-hint cl-hint--missing">
              ❌ Missing keywords: {cover_letter_missing.slice(0, 5).join(', ')}{cover_letter_missing.length > 5 ? ` +${cover_letter_missing.length - 5} more` : ''}.
            </p>
          )}
        </div>
      )}

      {/* 10 — Download button */}
      <DownloadButton />

    </div>
  )
}
