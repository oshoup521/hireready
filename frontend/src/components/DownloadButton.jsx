import { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './DownloadButton.css'

/**
 * DownloadButton — Renders #report-card to a real downloadable PDF using
 * html2canvas (DOM → canvas) + jsPDF (canvas → PDF).
 * No window.print(), no server round-trip, works offline.
 */
export default function DownloadButton() {
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleDownload() {
    const el = document.getElementById('report-card')
    if (!el) return

    setIsGenerating(true)
    try {
      // Capture the report card at 2× pixel density for crisp text on retina screens.
      // scrollY offset ensures we capture from the top of the element, not the viewport.
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.body)
          .getPropertyValue('--bg-primary')
          .trim() || '#0d0d0d',
        // Suppress the html2canvas scroll-restoration warning
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      })

      const imgData  = canvas.toDataURL('image/png')
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageW    = pdf.internal.pageSize.getWidth()
      const pageH    = pdf.internal.pageSize.getHeight()

      // Scale the canvas image to fit the A4 page width; tile across multiple
      // pages if the content is taller than one page.
      const imgW     = pageW
      const imgH     = (canvas.height * pageW) / canvas.width
      let   yOffset  = 0

      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, imgW, imgH)
        yOffset += pageH
      }

      pdf.save('hireready-report.pdf')
    } catch (err) {
      console.error('PDF generation failed:', err)
      // Graceful fallback to browser print dialog
      window.print()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="download-btn-wrapper">
      <button
        className="btn-primary download-btn"
        onClick={handleDownload}
        disabled={isGenerating}
        type="button"
      >
        <span>{isGenerating ? '⏳' : '📥'}</span>
        {isGenerating ? 'Generating PDF…' : 'Download Report as PDF'}
      </button>
    </div>
  )
}
