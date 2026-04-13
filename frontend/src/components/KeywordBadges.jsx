import './KeywordBadges.css'

const MAX_DISPLAY = 20  // Max badges per section before showing "+N more"

/**
 * KeywordBadges — Pill badge sections for keyword display.
 *
 * JD-comparison mode (default):
 *   matched {string[]}          Keywords in both resume and JD
 *   missing {string[]}          Keywords in JD but not resume
 *   extra   {string[]}          Keywords in resume but not JD
 *
 * ATS-only mode:
 *   resumeOnlyKeywords {string[]}  All keywords extracted from the resume
 */
export default function KeywordBadges({ matched, missing, extra, resumeOnlyKeywords }) {
  // ATS-only mode: show a single group of the resume's own keywords
  if (resumeOnlyKeywords) {
    return (
      <div className="keyword-badges-wrapper">
        <BadgeGroup
          icon="🔑"
          title="Detected Keywords"
          keywords={resumeOnlyKeywords}
          variant="extra"
        />
      </div>
    )
  }

  // JD-comparison mode: matched / missing / extra
  return (
    <div className="keyword-badges-wrapper">
      <BadgeGroup
        icon="✅"
        title="Matched Keywords"
        keywords={matched}
        variant="matched"
      />
      <BadgeGroup
        icon="❌"
        title="Missing Keywords"
        keywords={missing}
        variant="missing"
      />
      <BadgeGroup
        icon="➕"
        title="Extra Keywords"
        keywords={extra}
        variant="extra"
      />
    </div>
  )
}

/**
 * BadgeGroup — One labelled group of keyword pills.
 * Props:
 *   icon     {string}
 *   title    {string}
 *   keywords {string[]}
 *   variant  {"matched"|"missing"|"extra"}
 */
function BadgeGroup({ icon, title, keywords, variant }) {
  const shown = keywords.slice(0, MAX_DISPLAY)
  const remaining = keywords.length - shown.length

  return (
    <div className="badge-group">
      <div className="badge-group-header">
        <span className="badge-icon">{icon}</span>
        <span className="badge-group-title">{title}</span>
        <span className="badge-count">{keywords.length}</span>
      </div>

      <div className="badge-list">
        {shown.length === 0 ? (
          <span className="badge-empty">None</span>
        ) : (
          <>
            {shown.map((kw) => (
              <span key={kw} className={`badge badge--${variant}`}>
                {kw}
              </span>
            ))}
            {remaining > 0 && (
              <span className={`badge badge--${variant} badge--more`}>
                +{remaining} more
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
