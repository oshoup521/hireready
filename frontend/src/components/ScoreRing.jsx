import { useEffect, useState } from 'react'
import './ScoreRing.css'

/**
 * ScoreRing — Animated circular SVG ring showing the overall ATS score.
 * Props:
 *   score   {number}  0–100
 *   compact {bool}    Renders a smaller ring without the label (for compare cards)
 */
export default function ScoreRing({ score, compact = false }) {
  const [animatedScore, setAnimatedScore] = useState(0)

  // Animate the score counter on mount
  useEffect(() => {
    let frame
    const duration = 800  // ms
    const start = performance.now()

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * score))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [score])

  // SVG circle parameters — compact mode uses a smaller ring
  const radius = compact ? 42 : 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  // Colour based on score range
  function getColor() {
    if (score < 50) return 'var(--danger)'
    if (score < 75) return 'var(--warning)'
    return 'var(--success)'
  }

  // Label based on score range
  function getLabel() {
    if (score < 50) return 'Needs Work'
    if (score < 75) return 'Good Match'
    return 'Excellent Match'
  }

  const color = getColor()

  const cx = 80, cy = 80

  return (
    <div className={`score-ring-wrapper${compact ? ' score-ring-wrapper--compact' : ''}`}>
      <svg
        className="score-ring-svg"
        viewBox="0 0 160 160"
        aria-label={`Overall ATS score: ${score} out of 100`}
      >
        {/* Background track */}
        <circle
          className="ring-track"
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={compact ? 8 : 10}
        />
        {/* Animated progress arc */}
        <circle
          className="ring-progress"
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={compact ? 8 : 10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Score number */}
        <text
          x={cx} y={compact ? 76 : 76}
          textAnchor="middle"
          dominantBaseline="middle"
          className={compact ? 'ring-score-text ring-score-text--compact' : 'ring-score-text'}
          fill={color}
        >
          {animatedScore}
        </text>
        {/* "/100" label */}
        <text
          x={cx} y={compact ? 96 : 98}
          textAnchor="middle"
          dominantBaseline="middle"
          className="ring-denom-text"
          fill="var(--text-secondary)"
        >
          / 100
        </text>
      </svg>

      {/* Label below ring — hidden in compact mode */}
      {!compact && (
        <>
          <div className="ring-label">Overall ATS Score</div>
          <div className="ring-sublabel" style={{ color }}>{getLabel()}</div>
        </>
      )}
    </div>
  )
}
