import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import UploadSection from './components/UploadSection.jsx'
import ReportCard from './components/ReportCard.jsx'
import PDFViewer from './components/PDFViewer.jsx'

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

  // Submit resume (and optionally JD) to the backend and receive the score report
  async function analyzeResume(resumeFile, jdFile = null) {
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
    } catch (err) {
      clearTimeout(wakeupTimer)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      setIsWakingUp(false)
    }
  }

  return (
    <div className={`app-wrapper${report ? ' app-wrapper--wide' : ''}`}>
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {/* Centering wrapper: keeps upload in viewport centre until report arrives,
          then slides it up to the top so the report can appear below */}
      <div className={`upload-centering-wrapper${report ? ' upload-centering-wrapper--has-report' : ''}`}>
        <UploadSection
          onAnalyze={analyzeResume}
          isLoading={isLoading}
          isWakingUp={isWakingUp}
          error={error}
        />
      </div>

      {report && resumeFile && (
        <div className="split-layout fade-in-up">
          <div className="split-left">
            <PDFViewer file={resumeFile} jdFile={jdFile} />
          </div>
          <div className="split-right">
            <ReportCard report={report} />
          </div>
        </div>
      )}
    </div>
  )
}
