import { useRef } from 'react'
import { createPortal } from 'react-dom'
import './ScoreShareCard.css'

/**
 * ScoreShareCard — Spotify Wrapped-style shareable score card.
 *
 * Renders a visually rich card on a canvas and lets the user download
 * it as a PNG image. No external libraries — drawn via the Canvas 2D API.
 *
 * Props:
 *   report   {object}  Full scoring report
 *   onClose  {fn}      Called when the user dismisses the overlay
 */
export default function ScoreShareCard({ report, onClose }) {
  const canvasRef = useRef(null)

  const {
    overall_score = 0,
    keyword_match_score = 0,
    skills_score = 0,
    experience_score = 0,
    education_score = 0,
    mode,
    role,
    ats_preset,
  } = report

  const isResumeOnly = mode === 'resume_only'

  // ── Colour helpers ──────────────────────────────────────────────────
  function scoreGradient(score) {
    if (score >= 75) return ['#4caf7d', '#2e7d52']
    if (score >= 50) return ['#f0a500', '#b57a00']
    return ['#e05c5c', '#c0392b']
  }

  function scoreLabel(score) {
    if (score >= 75) return 'Excellent'
    if (score >= 50) return 'Good'
    return 'Needs Work'
  }

  // ── Draw the card onto the canvas ───────────────────────────────────
  function drawCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const W = 600
    const H = 800
    canvas.width  = W
    canvas.height = H

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0d0d0d')
    bg.addColorStop(1, '#1a0a2e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Decorative circle (top-right)
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.beginPath()
    ctx.arc(W - 30, -30, 220, 0, Math.PI * 2)
    ctx.fillStyle = '#6c63ff'
    ctx.fill()
    ctx.restore()

    // Brand name
    ctx.font = 'bold 20px Inter, sans-serif'
    ctx.fillStyle = '#6c63ff'
    ctx.fillText('HireReady', 40, 52)

    // Tagline
    ctx.font = '13px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText('Know your chances before they do', 40, 76)

    // Horizontal rule
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, 92)
    ctx.lineTo(W - 40, 92)
    ctx.stroke()

    // Big score circle
    const cx = W / 2
    const cy = 220
    const radius = 110
    const [colStart, colEnd] = scoreGradient(overall_score)
    const arc = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius)
    arc.addColorStop(0, colStart)
    arc.addColorStop(1, colEnd)

    // Outer glow
    ctx.save()
    ctx.shadowBlur = 40
    ctx.shadowColor = colStart

    // Track ring (dim)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 14
    ctx.stroke()

    // Score arc
    const fraction = overall_score / 100
    ctx.beginPath()
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2)
    ctx.strokeStyle = arc
    ctx.lineWidth = 14
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()

    // Score number
    ctx.font = 'bold 72px Inter, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(overall_score, cx, cy + 22)

    // Label
    ctx.font = 'bold 16px Inter, sans-serif'
    ctx.fillStyle = colStart
    ctx.textAlign = 'center'
    ctx.fillText(scoreLabel(overall_score), cx, cy + 52)

    // "Overall ATS Score"
    ctx.font = '12px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText('Overall ATS Score', cx, cy + 72)

    // Sub-scores
    ctx.textAlign = 'left'
    const bars = isResumeOnly
      ? [
          { label: 'Skills',      score: skills_score,     color: '#8b85ff' },
          { label: 'Experience',  score: experience_score, color: '#4caf7d' },
          { label: 'Education',   score: education_score,  color: '#f0a500' },
        ]
      : [
          { label: 'Keywords',    score: keyword_match_score, color: '#6c63ff' },
          { label: 'Skills',      score: skills_score,        color: '#8b85ff' },
          { label: 'Experience',  score: experience_score,    color: '#4caf7d' },
          { label: 'Education',   score: education_score,     color: '#f0a500' },
        ]

    const barTop = 370
    const barH   = 8
    const barGap = 48
    const barW   = W - 80

    bars.forEach(({ label, score, color }, i) => {
      const y = barTop + i * barGap

      // Label
      ctx.font = '13px Inter, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.fillText(label, 40, y)

      // Score %
      ctx.font = 'bold 13px Inter, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'right'
      ctx.fillText(`${score}%`, W - 40, y)
      ctx.textAlign = 'left'

      // Track
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      roundRect(ctx, 40, y + 8, barW, barH, 4)
      ctx.fill()

      // Fill
      ctx.fillStyle = color
      roundRect(ctx, 40, y + 8, Math.max(8, barW * score / 100), barH, 4)
      ctx.fill()
    })

    // Bottom row: role + preset
    const metaY = barTop + bars.length * barGap + 28
    ctx.font = '11px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    const parts = []
    if (role && role !== 'default') parts.push(`Role: ${role.replace('_', ' ')}`)
    if (ats_preset) parts.push(`ATS: ${ats_preset}`)
    if (parts.length) ctx.fillText(parts.join('  ·  '), 40, metaY)

    // Footer
    ctx.font = '11px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.textAlign = 'center'
    ctx.fillText('hireready.oshoupadhyay.in', cx, H - 24)
    ctx.textAlign = 'left'
  }

  // ── Download helper ──────────────────────────────────────────────────
  function handleDownload() {
    drawCard()
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `hireready-score-${overall_score}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return createPortal(
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <span className="share-modal-title">Share Your Score</span>
          <button className="share-close-btn" onClick={onClose} type="button" aria-label="Close">×</button>
        </div>

        {/* Visible preview (HTML replica — canvas is hidden for download) */}
        <div
          className="share-preview-card"
          style={{ '--score-color': scoreGradient(overall_score)[0] }}
        >
          <div className="share-brand">HireReady</div>
          <div className="share-tagline">Know your chances before they do</div>

          <div className="share-ring-wrap">
            <svg viewBox="0 0 120 120" className="share-ring">
              <circle cx="60" cy="60" r="50" className="share-ring-track" />
              <circle
                cx="60" cy="60" r="50"
                className="share-ring-fill"
                style={{
                  strokeDasharray: `${2 * Math.PI * 50}`,
                  strokeDashoffset: `${2 * Math.PI * 50 * (1 - overall_score / 100)}`,
                  stroke: scoreGradient(overall_score)[0],
                }}
              />
            </svg>
            <div className="share-ring-center">
              <span className="share-big-score">{overall_score}</span>
              <span className="share-score-label" style={{ color: scoreGradient(overall_score)[0] }}>
                {scoreLabel(overall_score)}
              </span>
            </div>
          </div>

          <div className="share-sub-scores">
            {(isResumeOnly
              ? [
                  { label: 'Skills',     score: skills_score,     color: '#8b85ff' },
                  { label: 'Experience', score: experience_score, color: '#4caf7d' },
                  { label: 'Education',  score: education_score,  color: '#f0a500' },
                ]
              : [
                  { label: 'Keywords',   score: keyword_match_score, color: '#6c63ff' },
                  { label: 'Skills',     score: skills_score,        color: '#8b85ff' },
                  { label: 'Experience', score: experience_score,    color: '#4caf7d' },
                  { label: 'Education',  score: education_score,     color: '#f0a500' },
                ]
            ).map(({ label, score, color }) => (
              <div key={label} className="share-bar-row">
                <span className="share-bar-label">{label}</span>
                <div className="share-bar-track">
                  <div className="share-bar-fill" style={{ width: `${score}%`, background: color }} />
                </div>
                <span className="share-bar-pct">{score}%</span>
              </div>
            ))}
          </div>

          {(role && role !== 'default') || ats_preset ? (
            <div className="share-meta">
              {role && role !== 'default' && <span>Role: {role.replace('_', ' ')}</span>}
              {ats_preset && <span>ATS: {ats_preset}</span>}
            </div>
          ) : null}

          <div className="share-footer">hireready.oshoupadhyay.in</div>
        </div>

        {/* Hidden canvas used for PNG export */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <button className="btn-primary share-download-btn" onClick={handleDownload} type="button">
          ⬇ Download as PNG
        </button>
        <p className="share-hint">Or take a screenshot of the card above to share!</p>
      </div>
    </div>,
    document.body
  )
}

// ── Utility: draw a rounded rect on canvas ────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
