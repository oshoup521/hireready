import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import UploadSection from './components/UploadSection.jsx'
import ReportCard from './components/ReportCard.jsx'
import ResumeTextViewer from './components/ResumeTextViewer.jsx'
import ScoreHistory, { loadHistory, saveToHistory, clearHistory, deleteHistoryEntry } from './components/ScoreHistory.jsx'
import CompareMode from './components/CompareMode.jsx'

// In production VITE_API_URL is the full Render URL.
// Locally it's empty — Vite's proxy forwards /analyze and /health to :8000.
const API_URL = import.meta.env.VITE_API_URL || ''

// Delay (ms) before showing the "backend is waking up" banner
const WAKEUP_DELAY_MS = 5000

export default function App() {
  const [report, setReport] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [jdFile, setJdFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState('dark')
  // Incrementing this key forces UploadSection to remount and reset its local state
  const [uploadKey, setUploadKey] = useState(0)
  // Incrementing this key forces the split-layout to remount, replaying the fade-in-up
  const [reportKey, setReportKey] = useState(0)
  const [history, setHistory] = useState(() => loadHistory())
  const [compareMode, setCompareMode] = useState(false)
  const [viewerCollapsed, setViewerCollapsed] = useState(
    () => window.matchMedia('(max-width: 900px)').matches
  )

  // On mount — restore saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('hireready-theme') || 'dark'
    setTheme(saved)
    document.body.className = saved
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
    setJdFile(null)
    setError(null)
    setUploadKey((k) => k + 1)   // remounts UploadSection, clearing its file state
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Submit resume (and optionally JD/cover letter) to the backend
  async function analyzeResume(resumeFile, jdFile = null, coverLetterFile = null, atsPreset = null) {
    setIsLoading(true)
    setIsWakingUp(false)
    setError(null)
    setReport(null)
    setResumeFile(resumeFile)
    setJdFile(jdFile)

    // Start wakeup timer — show banner if backend hasn't responded in 5s
    const wakeupTimer = setTimeout(() => {
      setIsWakingUp(true)
    }, WAKEUP_DELAY_MS)

    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      // Only append jd when provided (null = ATS-only mode)
      if (jdFile) formData.append('jd', jdFile)
      if (coverLetterFile) formData.append('cover_letter', coverLetterFile)
      if (atsPreset) formData.append('ats_preset', atsPreset)

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })

      clearTimeout(wakeupTimer)

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${response.status}`)
      }

      const data = await response.json()
      setReport(data)
      // Persist to history
      const updated = saveToHistory(data, resumeFile.name)
      setHistory(updated)
    } catch (err) {
      clearTimeout(wakeupTimer)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      setIsWakingUp(false)
    }
  }

  return (
    <>
      {/* Header lives outside app-wrapper so the sticky glass spans the full viewport width */}
      <Header theme={theme} onToggleTheme={toggleTheme} compareMode={compareMode} onToggleCompare={() => setCompareMode((c) => !c)} />
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
          isWakingUp={isWakingUp}
          error={error}
        />
      </div>

      {/* Score history — shown when there are saved runs */}
      {!compareMode && history.length > 0 && (
        <ScoreHistory
          entries={history}
          onRestore={(savedReport) => {
            // Step 1 — snap viewport to top and clear any existing report.
            //   This puts the upload section back in its "centered" state
            //   so the slide-up transition has a visible starting point.
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
        <div key={reportKey} className={`split-layout fade-in-up${viewerCollapsed ? ' split-layout--viewer-hidden' : ''}`}>
          <div className="split-left">
            <ResumeTextViewer
              report={report}
              collapsed={viewerCollapsed}
              onToggle={() => setViewerCollapsed(c => !c)}
            />
          </div>
          <div className="split-right">
            <ReportCard report={report} />
          </div>
        </div>
      )}
    </div>
    </>
  )
}
