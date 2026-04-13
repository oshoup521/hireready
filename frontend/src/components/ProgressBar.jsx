import { useEffect, useRef } from 'react'
import './ProgressBar.css'

/**
 * ProgressBar — Animated horizontal progress bar for sub-scores.
 * Props:
 *   label {string}  Display label (e.g., "Keyword Match")
 *   score {number}  0–100
 *   color {string}  CSS color string (e.g., "var(--accent)")
 */
export default function ProgressBar({ label, score, color }) {
  const fillRef = useRef(null)

  // Animate the bar width on mount using requestAnimationFrame
  useEffect(() => {
    const el = fillRef.current
    if (!el) return

    // Start from 0, animate to target score
    el.style.width = '0%'
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.width = `${score}%`
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [score])

  return (
    <div className="progress-bar-wrapper">
      {/* Label row */}
      <div className="progress-label-row">
        <span className="progress-label">{label}</span>
        <span className="progress-score" style={{ color }}>{score}%</span>
      </div>

      {/* Track and fill */}
      <div className="progress-track">
        <div
          ref={fillRef}
          className="progress-fill"
          style={{ backgroundColor: color, width: 0 }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
