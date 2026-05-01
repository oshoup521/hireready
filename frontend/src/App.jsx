import { useState, useEffect, useRef } from 'react'
import Header from './components/Header.jsx'
import UploadSection from './components/UploadSection.jsx'
import ReportCard from './components/ReportCard.jsx'
import ResumeTextViewer from './components/ResumeTextViewer.jsx'
import ScoreHistory, { loadHistory, saveToHistory, clearHistory, deleteHistoryEntry } from './components/ScoreHistory.jsx'
import CompareMode from './components/CompareMode.jsx'
import CoachChat from './components/CoachChat.jsx'
import CoverLetterGenerator from './components/CoverLetterGenerator.jsx'

// In production VITE_API_URL is the full Render URL.
// Locally it's empty — Vite's proxy forwards /analyze and /health to :8000.
const API_URL = import.meta.env.VITE_API_URL || ''

// 'idle' | 'waking' | 'ready' | 'error'
const BACKEND_STATUS = { IDLE: 'idle', WAKING: 'waking', READY: 'ready', ERROR: 'error' }

export default function App() {
  const [report, setReport] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [backendStatus, setBackendStatus] = useState(BACKEND_STATUS.IDLE)
  // Incrementing this key forces UploadSection to remount and reset its local state
  const [uploadKey, setUploadKey] = useState(0)
  // Incrementing this key forces the split-layout to remount, replaying the fade-in-up
  const [reportKey, setReportKey] = useState(0)
  const [history, setHistory] = useState(() => loadHistory())
  // The previous-run entry used by ScoreDiff (set when we have a new or restored report)
  const [previousEntry, setPreviousEntry] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [viewerCollapsed, setViewerCollapsed] = useState(
    () => window.matchMedia('(max-width: 900px)').matches
  )
  // Inline rewrite: { text, seq } — seq increments so same line can be re-sent
  const rewriteSeq = useRef(0)
  const [rewriteRequest, setRewriteRequest] = useState(null)

  function handleRewriteRequest(line) {
    rewriteSeq.current++
    setRewriteRequest({ text: line, seq: rewriteSeq.current })
  }

  // On mount — restore saved theme, or fall back to the OS preference
  useEffect(() => {
    const saved = localStorage.getItem('hireready-theme')
    const systemPreferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    const initial = saved || systemPreferred
    setTheme(initial)
    document.body.className = initial
  }, [])

  // On mount — ping /health to wake the Render free-tier backend.
  // Shows a "waking up" banner after 2 s if the backend hasn't responded yet.
  useEffect(() => {
    if (!API_URL) return   // no-op in local dev (Vite proxies directly)

    let wakeTimer = null
    let cancelled = false

    async function pingHealth() {
      // Show the banner only after a 2 s delay so it doesn't flash on fast responses
      wakeTimer = setTimeout(() => {
        if (!cancelled) setBackendStatus(BACKEND_STATUS.WAKING)
      }, 2000)

      try {
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(30000) })
        if (!cancelled) {
          setBackendStatus(res.ok ? BACKEND_STATUS.READY : BACKEND_STATUS.ERROR)
        }
      } catch {
        if (!cancelled) setBackendStatus(BACKEND_STATUS.ERROR)
      } finally {
        clearTimeout(wakeTimer)
      }
    }

    pingHealth()
    return () => { cancelled = true; clearTimeout(wakeTimer) }
  }, [])

  // Toggle between dark and light theme
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.body.className = next
    localStorage.setItem('hireready-theme', next)
  }

  // Reset everything so the user can start a fresh analysis
  function resetAnalysis() {
    setReport(null)
    setResumeFile(null)
    setError(null)
    setPreviousEntry(null)
    setUploadKey((k) => k + 1)   // remounts UploadSection, clearing its file state
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Submit resume (and optionally JD/cover letter) to the backend.
  // jdPayload is null (ATS-only) | { file: File } | { text: string }
  async function analyzeResume(resumeFile, jdPayload = null, coverLetterFile = null, atsPreset = null) {
    setIsLoading(true)
    setError(null)
    setReport(null)
    setResumeFile(resumeFile)

    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      // Append JD only when provided. File wins over text when both are set.
      if (jdPayload?.file) {
        formData.append('jd', jdPayload.file)
      } else if (jdPayload?.text) {
        formData.append('jd_text', jdPayload.text)
      }
      if (coverLetterFile) formData.append('cover_letter', coverLetterFile)
      if (atsPreset) formData.append('ats_preset', atsPreset)

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${response.status}`)
      }

      const data = await response.json()
      setReport(data)
      // Capture the most recent previous run before prepending the new one
      const prevEntry = history[0] || null
      setPreviousEntry(prevEntry)
      // Persist to history
      const updated = saveToHistory(data, resumeFile.name)
      setHistory(updated)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Backend wake-up banner — only shown while the Render free-tier service is cold-starting */}
      {(backendStatus === BACKEND_STATUS.WAKING || backendStatus === BACKEND_STATUS.ERROR) && (
        <div className={`backend-banner backend-banner--${backendStatus}`} role="status">
          {backendStatus === BACKEND_STATUS.WAKING ? (
            <><span className="backend-banner-spinner" />Backend is waking up on Render — this takes ~30 s on the free tier. Hang tight…</>
          ) : (
            <>⚠️ Backend may be unavailable. Uploads might fail — try again in a moment.</>
          )}
        </div>
      )}

      {/* Header lives outside app-wrapper so the sticky glass spans the full viewport width */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        compareMode={compareMode}
        onToggleCompare={() => setCompareMode((c) => !c)}
        onLogoClick={() => {
          setCompareMode(false)
          resetAnalysis()
        }}
      />
    <div className={`app-wrapper${report ? ' app-wrapper--wide' : ''}`}>

      {/* Centering wrapper: keeps upload in viewport centre until report arrives,
          then slides it up to the top so the report can appear below */}
      {/* Compare mode — full-width, replaces the normal upload+report flow */}
      {compareMode && (
        <CompareMode apiUrl={API_URL} onBack={() => setCompareMode(false)} />
      )}

      <div className={`upload-centering-wrapper${report ? ' upload-centering-wrapper--has-report' : ''}${compareMode ? ' upload-centering-wrapper--hidden' : ''}`}>
        <UploadSection
          key={uploadKey}
          onAnalyze={analyzeResume}
          onReset={resetAnalysis}
          hasReport={!!report}
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* Score history — shown when there are saved runs */}
      {!compareMode && history.length > 0 && (
        <ScoreHistory
          entries={history}
          onRestore={(savedReport, entryId) => {
            // Find the entry just before this one in history to show the diff
            const idx = history.findIndex((e) => e.id === entryId)
            const prev = idx >= 0 ? history[idx + 1] || null : null
            setPreviousEntry(prev)

            // Step 1 — snap viewport to top and clear any existing report.
            window.scrollTo(0, 0)
            setReport(null)

            // Step 2 — in the next animation frame React has already painted
            //   the "no-report / upload-centered" state.  Setting the report
            //   now triggers the --has-report class change and the 0.55s
            //   slide-up CSS transition plays exactly as it does after analyze.
            requestAnimationFrame(() => {
              setReport(savedReport)
              setReportKey((k) => k + 1)
            })
          }}
          onDelete={(id) => setHistory(deleteHistoryEntry(id))}
          onClear={() => {
            clearHistory()
            setHistory([])
            setReport(null)
          }}
        />
      )}

      {!compareMode && report && (
        <>
          <div key={reportKey} className={`split-layout fade-in-up${viewerCollapsed ? ' split-layout--viewer-hidden' : ''}`}>
            <div className="split-left">
              <ResumeTextViewer
                report={report}
                collapsed={viewerCollapsed}
                onToggle={() => setViewerCollapsed(c => !c)}
                onRewriteRequest={handleRewriteRequest}
              />
            </div>
            <div className="split-right">
              <ReportCard report={report} previousEntry={previousEntry} />
            </div>
          </div>
          {/* Resume Coach — remounts on each new report so chat history resets */}
          <CoachChat
            key={`coach-${reportKey}`}
            report={report}
            apiUrl={API_URL}
            rewriteRequest={rewriteRequest}
            onRewriteHandled={() => setRewriteRequest(null)}
          />
          {/* Cover Letter Generator */}
          <CoverLetterGenerator report={report} apiUrl={API_URL} />
        </>
      )}
    </div>
    </>
  )
}
