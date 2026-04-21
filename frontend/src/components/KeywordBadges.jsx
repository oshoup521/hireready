import { useState, useEffect, useRef } from 'react'
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
  const [copyMenuOpen, setCopyMenuOpen] = useState(false)
  const [copiedFormat, setCopiedFormat] = useState(null)   // 'csv' | 'list' | 'bullets'
  const menuRef = useRef(null)

  // Close the dropdown on outside click or Escape
  useEffect(() => {
    if (!copyMenuOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setCopyMenuOpen(false)
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setCopyMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [copyMenuOpen])

  function copyInFormat(format) {
    if (!missing?.length) return
    let text
    if (format === 'csv') text = missing.join(', ')
    else if (format === 'list') text = missing.join('\n')
    else if (format === 'bullets') text = missing.map((k) => `• ${k}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFormat(format)
      setCopyMenuOpen(false)
      setTimeout(() => setCopiedFormat(null), 2000)
    })
  }

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
        action={
          missing?.length > 0 && (
            <div className="copy-missing-wrap" ref={menuRef}>
              <button
                className={`copy-missing-btn ${copiedFormat ? 'copy-missing-btn--copied' : ''}`}
                onClick={() => setCopyMenuOpen((o) => !o)}
                type="button"
                aria-haspopup="menu"
                aria-expanded={copyMenuOpen}
                title="Copy missing keywords"
              >
                {copiedFormat ? '✓ Copied!' : `⎘ Copy all (${missing.length}) ▾`}
              </button>
              {copyMenuOpen && (
                <div className="copy-missing-menu" role="menu">
                  <button
                    className="copy-missing-menu-item"
                    onClick={() => copyInFormat('csv')}
                    type="button"
                    role="menuitem"
                  >
                    <span className="copy-menu-title">Comma-separated</span>
                    <span className="copy-menu-hint">react, node.js, aws …</span>
                  </button>
                  <button
                    className="copy-missing-menu-item"
                    onClick={() => copyInFormat('list')}
                    type="button"
                    role="menuitem"
                  >
                    <span className="copy-menu-title">Newline list</span>
                    <span className="copy-menu-hint">One keyword per line</span>
                  </button>
                  <button
                    className="copy-missing-menu-item"
                    onClick={() => copyInFormat('bullets')}
                    type="button"
                    role="menuitem"
                  >
                    <span className="copy-menu-title">Bulleted list</span>
                    <span className="copy-menu-hint">• keyword (per line)</span>
                  </button>
                </div>
              )}
            </div>
          )
        }
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
 *   action   {ReactNode}  Optional action element rendered in the header
 */
function BadgeGroup({ icon, title, keywords, variant, action }) {
  const shown = keywords.slice(0, MAX_DISPLAY)
  const remaining = keywords.length - shown.length

  return (
    <div className="badge-group">
      <div className="badge-group-header">
        <span className="badge-icon">{icon}</span>
        <span className="badge-group-title">{title}</span>
        <span className="badge-count">{keywords.length}</span>
        {action && <span className="badge-group-action">{action}</span>}
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
