import { useState, useRef } from 'react'
import './UploadSection.css'

export default function UploadSection({ onAnalyze, isLoading, isWakingUp, error }) {
  const [mode, setMode] = useState('ats_vs_jd')
  const [resumeFile, setResumeFile] = useState(null)
  const [jdFile, setJdFile] = useState(null)
  const [resumeDragOver, setResumeDragOver] = useState(false)
  const [jdDragOver, setJdDragOver] = useState(false)

  const resumeInputRef = useRef(null)
  const jdInputRef = useRef(null)

  function handleModeChange(newMode) {
    setMode(newMode)
    if (newMode === 'ats_only') setJdFile(null)
  }

  function handleFileChange(setter) {
    return (e) => {
      const file = e.target.files?.[0]
      if (file && file.type === 'application/pdf') setter(file)
    }
  }

  function handleDrop(setter, setDrag) {
    return (e) => {
      e.preventDefault()
      setDrag(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.type === 'application/pdf') setter(file)
    }
  }

  function handleAnalyze() {
    if (!resumeFile) return
    onAnalyze(resumeFile, mode === 'ats_vs_jd' ? jdFile : null)
  }

  const canAnalyze = !!resumeFile && (mode === 'ats_only' || !!jdFile) && !isLoading

  return (
    <section className="upload-section card">

      {/* Top bar: mode toggle left, hint text right */}
      <div className="upload-header">
        <div className="mode-toggle" role="group">
          <button
            className={`mode-btn ${mode === 'ats_vs_jd' ? 'mode-btn--active' : ''}`}
            onClick={() => handleModeChange('ats_vs_jd')}
            type="button"
          >
            ATS vs JD
          </button>
          <button
            className={`mode-btn ${mode === 'ats_only' ? 'mode-btn--active' : ''}`}
            onClick={() => handleModeChange('ats_only')}
            type="button"
          >
            ATS Check Only
          </button>
        </div>
        <span className="mode-hint">
          {mode === 'ats_vs_jd'
            ? 'Compare your resume against a job description'
            : 'Check ATS readiness without a job description'}
        </span>
      </div>

      {/* Upload inputs + button — inline for ats_only, grid for ats_vs_jd */}
      <div className={`upload-body upload-body--${mode}`}>

        {/* Resume drop zone */}
        <DropZone
          inputRef={resumeInputRef}
          file={resumeFile}
          isDragOver={resumeDragOver}
          label="Resume PDF"
          icon="📄"
          ariaLabel="Upload resume PDF"
          onChange={handleFileChange(setResumeFile)}
          onDrop={handleDrop(setResumeFile, setResumeDragOver)}
          onDragOver={(e) => { e.preventDefault(); setResumeDragOver(true) }}
          onDragLeave={() => setResumeDragOver(false)}
          onClick={() => resumeInputRef.current?.click()}
        />

        {/* JD drop zone — only in ATS vs JD mode */}
        {mode === 'ats_vs_jd' && (
          <DropZone
            inputRef={jdInputRef}
            file={jdFile}
            isDragOver={jdDragOver}
            label="Job Description PDF"
            icon="📋"
            ariaLabel="Upload job description PDF"
            onChange={handleFileChange(setJdFile)}
            onDrop={handleDrop(setJdFile, setJdDragOver)}
            onDragOver={(e) => { e.preventDefault(); setJdDragOver(true) }}
            onDragLeave={() => setJdDragOver(false)}
            onClick={() => jdInputRef.current?.click()}
          />
        )}

        {/* Analyze button */}
        <button
          className="btn-primary upload-btn"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
        >
          {isLoading ? (
            <><span className="spinner" /> Analyzing…</>
          ) : (
            mode === 'ats_only' ? 'Check Score →' : 'Analyze →'
          )}
        </button>
      </div>

      {isWakingUp && (
        <div className="wakeup-banner">
          ⏳ Backend is waking up on Render, please wait…
        </div>
      )}
      {error && (
        <div className="error-message">⚠️ {error}</div>
      )}
    </section>
  )
}

/* ── Reusable compact drop zone ── */
function DropZone({ inputRef, file, isDragOver, label, icon, ariaLabel,
                    onChange, onDrop, onDragOver, onDragLeave, onClick }) {
  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={ariaLabel}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={onChange}
        style={{ display: 'none' }}
      />
      {file ? (
        <>
          <span className="dz-icon dz-icon--ok">✅</span>
          <span className="dz-filename" title={file.name}>{file.name}</span>
        </>
      ) : (
        <>
          <span className="dz-icon">{icon}</span>
          <span className="dz-label">{label}</span>
          <span className="dz-hint">click or drag & drop</span>
        </>
      )}
    </div>
  )
}
