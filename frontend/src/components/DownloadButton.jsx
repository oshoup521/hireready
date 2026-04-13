import './DownloadButton.css'

/**
 * DownloadButton — Triggers window.print() to save the report card as PDF.
 * The print CSS in index.css hides everything except #report-card.
 */
export default function DownloadButton() {
  function handleDownload() {
    window.print()
  }

  return (
    <div className="download-btn-wrapper">
      <button className="btn-primary download-btn" onClick={handleDownload}>
        <span>📥</span>
        Download Report as PDF
      </button>
    </div>
  )
}
