import { useState } from 'react'
import './DetailPanel.css'

/**
 * DetailPanel — collapsible disclosure panel used under score bars
 * to show issue lists, verb lists, quantified lines, etc.
 *
 * Props:
 *   title    {string}    Header text (always visible)
 *   color    {string}    CSS color for the header accent (optional)
 *   children {ReactNode} Content shown when expanded
 */
export default function DetailPanel({ title, color, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="detail-panel">
      <button
        className="detail-panel-toggle"
        onClick={() => setOpen((o) => !o)}
        type="button"
        style={{ '--dp-color': color || 'var(--text-secondary)' }}
      >
        <span className="detail-panel-title">{title}</span>
        <span className="detail-panel-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="detail-panel-body">
          {children}
        </div>
      )}
    </div>
  )
}
