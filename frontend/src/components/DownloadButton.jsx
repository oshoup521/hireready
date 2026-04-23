import './DownloadButton.css'

/**
 * DownloadButton — triggers window.print() so the browser's Save-as-PDF
 * dialog handles rendering. The @media print rules in index.css hide
 * everything except #report-card and force a clean light background.
 * This is more reliable than html2canvas + jsPDF because it supports
 * all modern CSS (color-mix, custom properties, backdrop-filter, etc.).
 */
export default function DownloadButton() {
  return (
    <div className="download-btn-wrapper">
      <button
        className="btn-primary download-btn"
        onClick={() => window.print()}
        type="button"
      >
        <span>📥</span>
        Download Report as PDF
      </button>
    </div>
  )
}
