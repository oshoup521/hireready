import { useMemo, useEffect, useState } from 'react'
import './PDFViewer.css'

// Returns true if the file is a DOCX (browser can't render DOCX in an iframe)
function isDocx(file) {
  if (!file) return false
  return (
    file.name.toLowerCase().endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

// Fallback UI shown when the file is a DOCX
function DocxFallback({ file, url }) {
  return (
    <div className="docx-fallback">
      <span className="docx-fallback-icon">📝</span>
      <p className="docx-fallback-title">{file.name}</p>
      <p className="docx-fallback-note">DOCX files cannot be previewed in the browser.</p>
      <a href={url} download={file.name} className="docx-fallback-btn">
        Download to view
      </a>
    </div>
  )
}

/**
 * PDFViewer — Sticky left panel that shows one or two PDFs.
 *
 * Props:
 *   file   {File}       Resume PDF (always present)
 *   jdFile {File|null}  Job-description PDF (only in ATS vs JD mode)
 *
 * When jdFile is provided, a tab bar lets the user switch between the two
 * PDFs instantly — both iframes stay mounted so there's no reload flash.
 */
export default function PDFViewer({ file, jdFile }) {
  const [activeTab, setActiveTab] = useState('resume')
  // Collapsed by default on mobile so the score is fully visible first.
  // window.matchMedia is available in all modern browsers and reads the
  // actual CSS breakpoint, not raw device pixels.
  const [collapsed, setCollapsed] = useState(
    () => window.matchMedia('(max-width: 900px)').matches
  )

  // Create blob URLs once; revoke on unmount to free memory
  const resumeUrl = useMemo(() => URL.createObjectURL(file), [file])
  const jdUrl     = useMemo(() => jdFile ? URL.createObjectURL(jdFile) : null, [jdFile])

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(resumeUrl)
      if (jdUrl) URL.revokeObjectURL(jdUrl)
    }
  }, [resumeUrl, jdUrl])

  const activeFile = activeTab === 'resume' ? file : jdFile

  return (
    <div className={`pdf-viewer${collapsed ? ' pdf-viewer--collapsed' : ''}`}>

      {/* ── Header / tab bar ── */}
      {jdFile ? (
        /* Two-tab mode */
        <div className="pdf-tabs">
          <button
            className={`pdf-tab ${activeTab === 'resume' ? 'pdf-tab--active' : ''}`}
            onClick={() => setActiveTab('resume')}
            type="button"
          >
            <span className="pdf-tab-icon">📄</span>
            Resume
          </button>
          <button
            className={`pdf-tab ${activeTab === 'jd' ? 'pdf-tab--active' : ''}`}
            onClick={() => setActiveTab('jd')}
            type="button"
          >
            <span className="pdf-tab-icon">📋</span>
            Job Description
          </button>

          {/* Filename of the currently visible PDF */}
          <span className="pdf-active-name" title={activeFile?.name}>
            {activeFile?.name}
          </span>

          {/* Collapse toggle — always visible, most useful on mobile */}
          <button
            className="pdf-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            type="button"
            aria-label={collapsed ? 'Expand PDF viewer' : 'Collapse PDF viewer'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      ) : (
        /* Single-file mode */
        <div className="pdf-single-header">
          <span className="pdf-tab-icon">📄</span>
          <span className="pdf-active-name" title={file.name}>{file.name}</span>

          {/* Collapse toggle */}
          <button
            className="pdf-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            type="button"
            aria-label={collapsed ? 'Expand PDF viewer' : 'Collapse PDF viewer'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      )}

      {/* ── PDF iframes / DOCX fallback — hidden when collapsed ── */}
      {!collapsed && (
        <>
          {/* Resume */}
          <div style={{ display: activeTab === 'resume' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
            {isDocx(file)
              ? <DocxFallback file={file} url={resumeUrl} />
              : <iframe src={resumeUrl} title="Resume" className="pdf-iframe" />
            }
          </div>

          {/* Job Description */}
          {jdUrl && (
            <div style={{ display: activeTab === 'jd' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
              {isDocx(jdFile)
                ? <DocxFallback file={jdFile} url={jdUrl} />
                : <iframe src={jdUrl} title="Job Description" className="pdf-iframe" />
              }
            </div>
          )}
        </>
      )}
    </div>
  )
}
